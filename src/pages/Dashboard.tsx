import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { ref, onValue } from "firebase/database";

function MI({ icon, size = 20 }: { icon: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {icon}
    </span>
  );
}

const MEMBERSHIP_CONFIG = {
  basic: { label: "Basic", color: "#9ca3af", emoji: "🔵" },
  silver: { label: "Silver", color: "#e2e8f0", emoji: "⚪" },
  gold: { label: "Gold", color: "hsl(38 92% 50%)", emoji: "🥇" },
} as const;

const NEWS_PREVIEW = [
  {
    emoji: "🏆",
    type: "Event",
    title: "30-Day Transformation Challenge",
    date: "1 Apr 2026",
  },
  {
    emoji: "💪",
    type: "News",
    title: "New CrossFit Equipment Arrived",
    date: "20 Mar 2026",
  },
  {
    emoji: "🏃",
    type: "Event",
    title: "Charity Fun Run — 5km & 10km",
    date: "12 Apr 2026",
  },
];

// ── Rewards helpers ───────────────────────────────────────────────────────────
const CHECKIN_MILESTONE = 40;

export function getRewardStatus(checkIns: any[], rewards: Record<string, any>) {
  const total = checkIns.length;
  const milestonesEarned = Math.floor(total / CHECKIN_MILESTONE);
  const rewardsRedeemed = Object.values(rewards ?? {}).filter(
    (r) => r.status === "redeemed",
  ).length;
  const rewardsPending = Object.values(rewards ?? {}).filter(
    (r) => r.status === "pending",
  );
  const nextMilestoneAt = (milestonesEarned + 1) * CHECKIN_MILESTONE;
  const progressToNext = total % CHECKIN_MILESTONE;
  return {
    total,
    milestonesEarned,
    rewardsRedeemed,
    rewardsPending,
    nextMilestoneAt,
    progressToNext,
    pct: Math.round((progressToNext / CHECKIN_MILESTONE) * 100),
  };
}

export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveNews, setLiveNews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, "admin_news"), (snap) => {
      if (!snap.exists()) return;
      const lastSeen = (user as any).lastSeenNewsAt ?? 0;
      const items = Object.values(snap.val()) as any[];
      const sorted = items.sort(
        (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
      );
      setLiveNews(sorted.slice(0, 3));
      const unread = items.filter((n) => (n.createdAt ?? 0) > lastSeen).length;
      setUnreadCount(unread);
    });
  }, [user]);

  if (!user) return null;

  const firebaseUser = auth.currentUser;
  const emailVerified = firebaseUser?.emailVerified ?? true;
  const showVerifyBanner = !emailVerified && !verifyDismissed;

  const resendVerification = async () => {
    if (!firebaseUser) return;
    setResending(true);
    try {
      await sendEmailVerification(firebaseUser);
      setResendSent(true);
    } catch {}
    setResending(false);
  };

  const membership = (user as any).membership ?? "basic";
  const memberConfig =
    MEMBERSHIP_CONFIG[membership as keyof typeof MEMBERSHIP_CONFIG];
  const memberRank = { basic: 0, silver: 1, gold: 2 }[membership] ?? 0;
  const isLocked = (required: "basic" | "silver" | "gold") =>
    ({ basic: 0, silver: 1, gold: 2 })[required] > memberRank;

  const rewards = (user as any).rewards ?? {};
  const rewardStatus = getRewardStatus(user.checkIns, rewards);
  const hasPendingReward = rewardStatus.rewardsPending.length > 0;

  const stats = [
    { label: "Workouts", value: user.workouts.length, icon: "bolt" },
    { label: "Classes", value: user.bookings.length, icon: "fitness_center" },
    { label: "Check-ins", value: user.checkIns.length, icon: "where_to_vote" },
    { label: "Points", value: user.points, icon: "star" },
  ];

  const newsToShow = liveNews.length > 0 ? liveNews : NEWS_PREVIEW;

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      {/* ── Welcome header ──────────────────────────────────────────────── */}
      <div className="mb-5">
        <div
          className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[28px]" : "text-[40px]"}`}
        >
          Welcome,{" "}
          <span className="text-primary">{user.name.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-muted-foreground text-xs">
            {user.goal} · {user.level}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              background: `${memberConfig.color}20`,
              color: memberConfig.color,
              border: `1px solid ${memberConfig.color}40`,
            }}
          >
            {memberConfig.emoji} {memberConfig.label}
          </span>
        </div>
      </div>

      {/* ── Email verification banner ───────────────────────────────────── */}
      <AnimatePresence>
        {showVerifyBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
            style={{
              background: "hsl(38 92% 44% / 0.1)",
              border: "1px solid hsl(38 92% 44% / 0.3)",
            }}
          >
            <span className="text-xl">📧</span>
            <div className="flex-1 min-w-0">
              <div
                className="font-bold text-xs"
                style={{ color: "hsl(38 92% 44%)" }}
              >
                Verify your email
              </div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <div className="flex gap-2">
              {!resendSent ? (
                <button
                  onClick={resendVerification}
                  disabled={resending}
                  className="text-xs font-bold px-3 py-1 rounded-lg border-none cursor-pointer"
                  style={{ background: "hsl(38 92% 44%)", color: "#000" }}
                >
                  {resending ? "Sending…" : "Resend"}
                </button>
              ) : (
                <span className="text-xs font-bold text-green-500">
                  ✓ Sent!
                </span>
              )}
              <button
                onClick={() => setVerifyDismissed(true)}
                className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats row — all 4 in one line ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-xl p-3 text-center"
          >
            <div className="font-display text-2xl text-primary leading-none mb-0.5">
              {s.value}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Book a Class — hero CTA ────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        onClick={() => setPage("Classes")}
        className="w-full mb-4 rounded-2xl border-none cursor-pointer transition-all active:scale-[0.98] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(20 100% 50%) 0%, hsl(20 100% 38%) 100%)",
          boxShadow: "0 4px 24px hsl(20 100% 50% / 0.35)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-left">
            <div className="font-display text-xl tracking-wide text-black leading-tight">
              Book a Class
            </div>
            <div className="text-[11px] font-bold text-black/60 mt-0.5">
              View today's schedule →
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,0,0,0.15)" }}
          >
            <MI icon="fitness_center" size={22} />
          </div>
        </div>
      </motion.button>

      {/* ── Rewards / Check-in progress ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mk2-card mb-4"
        style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div>
            <div className="font-bold text-sm">Rewards Progress</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {rewardStatus.progressToNext} / {CHECKIN_MILESTONE} check-ins to
              next reward
            </div>
          </div>
          <div className="flex gap-2">
            {hasPendingReward && (
              <button
                onClick={() => setPage("Checkin")}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer animate-pulse"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
              >
                🎁 Claim Reward!
              </button>
            )}
            <button
              onClick={() => setPage("Checkin")}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer"
              style={{
                background: "hsl(var(--secondary))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              ✅ Check In
            </button>
          </div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${rewardStatus.pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ background: "hsl(20 100% 50%)" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>{rewardStatus.total} total check-ins</span>
          <span>
            {rewardStatus.milestonesEarned} reward
            {rewardStatus.milestonesEarned !== 1 ? "s" : ""} earned
          </span>
        </div>
      </motion.div>

      {/* ── Activity + News grid ────────────────────────────────────────── */}
      <div
        className={`grid gap-4 ${isTablet || isMobile ? "grid-cols-1" : "grid-cols-3"}`}
      >
        {/* Training Log */}
        <div className="mk2-card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <MI icon="bolt" size={16} /> Training Log
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setPage("Workout")}>
              + Log
            </Btn>
          </div>
          {user.workouts.length === 0 ? (
            <div className="text-muted-foreground text-xs py-3 text-center">
              No sessions yet.{" "}
              <span
                className="text-primary cursor-pointer font-bold"
                onClick={() => setPage("Workout")}
              >
                Try AI Planner →
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
                    className="flex justify-between items-center py-1.5 border-b border-border text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {w.type}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {w.duration}min
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Booked Classes */}
        <div className="mk2-card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <MI icon="fitness_center" size={16} /> Classes
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setPage("Classes")}>
              Book
            </Btn>
          </div>
          {user.bookings.length === 0 ? (
            <div className="text-muted-foreground text-xs py-3 text-center">
              No classes booked.{" "}
              <span
                className="text-primary cursor-pointer font-bold"
                onClick={() => setPage("Classes")}
              >
                Browse →
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
                    className="flex justify-between items-center py-1.5 border-b border-border text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[120px]">
                      {b.name}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {b.time}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* News */}
        <div
          className="mk2-card cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => setPage("News")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <MI icon="campaign" size={16} /> News & Events
            </div>
            <span className="text-[10px] text-primary font-bold">
              View all →
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {newsToShow.map((n: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1.5 border-b border-border"
              >
                <span className="text-base shrink-0">{n.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-foreground">
                    {n.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {n.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick tools ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`grid gap-2 mt-4 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {[
          {
            label: "AI Workout",
            icon: "bolt",
            page: "Workout",
            required: "gold" as const,
          },
          {
            label: "Leaderboard",
            icon: "emoji_events",
            page: "Leaderboard",
            required: "silver" as const,
          },
          {
            label: "InBody Scan",
            icon: "monitor_heart",
            page: "InBody",
            required: "gold" as const,
          },
        ].map((a) => {
          const locked = isLocked(a.required);
          return (
            <button
              key={a.label}
              onClick={() => setPage(a.page)}
              className="bg-card border border-border rounded-xl flex items-center gap-2.5 py-3 px-4 cursor-pointer hover:border-primary/30 transition-all text-left w-full"
              style={{ opacity: locked ? 0.6 : 1 }}
            >
              <MI icon={locked ? "lock" : a.icon} size={18} />
              <span className="font-bold text-xs text-foreground">
                {a.label}
              </span>
              {locked && (
                <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground">
                  {a.required}+
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";
// import { auth, db } from "@/lib/firebase";
// import { sendEmailVerification } from "firebase/auth";
// import { ref, onValue } from "firebase/database";

// function MI({ icon, size = 20 }: { icon: string; size?: number }) {
//   return (
//     <span
//       className="material-symbols-rounded"
//       style={{ fontSize: size, lineHeight: 1 }}
//     >
//       {icon}
//     </span>
//   );
// }

// const MEMBERSHIP_CONFIG = {
//   basic: { label: "Basic", color: "#9ca3af", emoji: "🔵" },
//   silver: { label: "Silver", color: "#e2e8f0", emoji: "⚪" },
//   gold: { label: "Gold", color: "hsl(38 92% 50%)", emoji: "🥇" },
// } as const;

// const NEWS_PREVIEW = [
//   {
//     emoji: "🏆",
//     type: "Event",
//     title: "30-Day Transformation Challenge",
//     date: "1 Apr 2026",
//   },
//   {
//     emoji: "💪",
//     type: "News",
//     title: "New CrossFit Equipment Arrived",
//     date: "20 Mar 2026",
//   },
//   {
//     emoji: "🏃",
//     type: "Event",
//     title: "Charity Fun Run — 5km & 10km",
//     date: "12 Apr 2026",
//   },
// ];

// // ── Rewards helpers ───────────────────────────────────────────────────────────
// const CHECKIN_MILESTONE = 40;

// export function getRewardStatus(checkIns: any[], rewards: Record<string, any>) {
//   const total = checkIns.length;
//   const milestonesEarned = Math.floor(total / CHECKIN_MILESTONE);
//   const rewardsRedeemed = Object.values(rewards ?? {}).filter(
//     (r) => r.status === "redeemed",
//   ).length;
//   const rewardsPending = Object.values(rewards ?? {}).filter(
//     (r) => r.status === "pending",
//   );
//   const nextMilestoneAt = (milestonesEarned + 1) * CHECKIN_MILESTONE;
//   const progressToNext = total % CHECKIN_MILESTONE;
//   return {
//     total,
//     milestonesEarned,
//     rewardsRedeemed,
//     rewardsPending,
//     nextMilestoneAt,
//     progressToNext,
//     pct: Math.round((progressToNext / CHECKIN_MILESTONE) * 100),
//   };
// }

// export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile, isTablet } = useBreakpoint();

//   const [verifyDismissed, setVerifyDismissed] = useState(false);
//   const [resendSent, setResendSent] = useState(false);
//   const [resending, setResending] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [liveNews, setLiveNews] = useState<any[]>([]);

//   useEffect(() => {
//     if (!user) return;
//     return onValue(ref(db, "admin_news"), (snap) => {
//       if (!snap.exists()) return;
//       const lastSeen = (user as any).lastSeenNewsAt ?? 0;
//       const items = Object.values(snap.val()) as any[];
//       const sorted = items.sort(
//         (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
//       );
//       setLiveNews(sorted.slice(0, 3));
//       const unread = items.filter((n) => (n.createdAt ?? 0) > lastSeen).length;
//       setUnreadCount(unread);
//     });
//   }, [user]);

//   if (!user) return null;

//   const firebaseUser = auth.currentUser;
//   const emailVerified = firebaseUser?.emailVerified ?? true;
//   const showVerifyBanner = !emailVerified && !verifyDismissed;

//   const resendVerification = async () => {
//     if (!firebaseUser) return;
//     setResending(true);
//     try {
//       await sendEmailVerification(firebaseUser);
//       setResendSent(true);
//     } catch {}
//     setResending(false);
//   };

//   const membership = (user as any).membership ?? "basic";
//   const memberConfig =
//     MEMBERSHIP_CONFIG[membership as keyof typeof MEMBERSHIP_CONFIG];
//   const memberRank = { basic: 0, silver: 1, gold: 2 }[membership] ?? 0;
//   const isLocked = (required: "basic" | "silver" | "gold") =>
//     ({ basic: 0, silver: 1, gold: 2 })[required] > memberRank;

//   const rewards = (user as any).rewards ?? {};
//   const rewardStatus = getRewardStatus(user.checkIns, rewards);
//   const hasPendingReward = rewardStatus.rewardsPending.length > 0;

//   const stats = [
//     { label: "Workouts", value: user.workouts.length, icon: "bolt" },
//     { label: "Classes", value: user.bookings.length, icon: "fitness_center" },
//     { label: "Check-ins", value: user.checkIns.length, icon: "where_to_vote" },
//     { label: "Points", value: user.points, icon: "star" },
//   ];

//   const newsToShow = liveNews.length > 0 ? liveNews : NEWS_PREVIEW;

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       {/* ── Top bar: welcome + bell ─────────────────────────────────────── */}
//       <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
//         <div>
//           <div
//             className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[28px]" : "text-[40px]"}`}
//           >
//             Welcome,{" "}
//             <span className="text-primary">{user.name.split(" ")[0]}</span>
//           </div>
//           <div className="flex items-center gap-2 mt-1 flex-wrap">
//             <span className="text-muted-foreground text-xs">
//               {user.goal} · {user.level}
//             </span>
//             <span
//               className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
//               style={{
//                 background: `${memberConfig.color}20`,
//                 color: memberConfig.color,
//                 border: `1px solid ${memberConfig.color}40`,
//               }}
//             >
//               {memberConfig.emoji} {memberConfig.label}
//             </span>
//           </div>
//         </div>
//         {/* Bell button removed */}
//       </div>
//       {/* <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
//         <div>
//           <div
//             className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[28px]" : "text-[40px]"}`}
//           >
//             Welcome,{" "}
//             <span className="text-primary">{user.name.split(" ")[0]}</span>
//           </div>
//           <div className="flex items-center gap-2 mt-1 flex-wrap">
//             <span className="text-muted-foreground text-xs">
//               {user.goal} · {user.level}
//             </span>
//             <span
//               className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
//               style={{
//                 background: `${memberConfig.color}20`,
//                 color: memberConfig.color,
//                 border: `1px solid ${memberConfig.color}40`,
//               }}
//             >
//               {memberConfig.emoji} {memberConfig.label}
//             </span>
//           </div>
//         </div>
//         <button
//           onClick={() => setPage("Notifications")}
//           className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all"
//           style={{
//             background:
//               unreadCount > 0
//                 ? "hsl(20 100% 50% / 0.1)"
//                 : "hsl(var(--secondary))",
//             border: `1px solid ${unreadCount > 0 ? "hsl(20 100% 50% / 0.3)" : "hsl(var(--border))"}`,
//           }}
//         >
//           <MI icon="notifications" size={18} />
//           {unreadCount > 0 && (
//             <span
//               className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
//               style={{ background: "hsl(20 100% 50%)" }}
//             >
//               {unreadCount > 9 ? "9+" : unreadCount}
//             </span>
//           )}
//           <span className="text-xs font-bold text-muted-foreground hidden sm:block">
//             {unreadCount > 0 ? `${unreadCount} new` : "Alerts"}
//           </span>
//         </button>
//       </div> */}

//       {/* ── Email verification banner ───────────────────────────────────── */}
//       <AnimatePresence>
//         {showVerifyBanner && (
//           <motion.div
//             initial={{ opacity: 0, height: 0 }}
//             animate={{ opacity: 1, height: "auto" }}
//             exit={{ opacity: 0, height: 0 }}
//             className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
//             style={{
//               background: "hsl(38 92% 44% / 0.1)",
//               border: "1px solid hsl(38 92% 44% / 0.3)",
//             }}
//           >
//             <span className="text-xl">📧</span>
//             <div className="flex-1 min-w-0">
//               <div
//                 className="font-bold text-xs"
//                 style={{ color: "hsl(38 92% 44%)" }}
//               >
//                 Verify your email
//               </div>
//               <div className="text-xs text-muted-foreground">{user.email}</div>
//             </div>
//             <div className="flex gap-2">
//               {!resendSent ? (
//                 <button
//                   onClick={resendVerification}
//                   disabled={resending}
//                   className="text-xs font-bold px-3 py-1 rounded-lg border-none cursor-pointer"
//                   style={{ background: "hsl(38 92% 44%)", color: "#000" }}
//                 >
//                   {resending ? "Sending…" : "Resend"}
//                 </button>
//               ) : (
//                 <span className="text-xs font-bold text-green-500">
//                   ✓ Sent!
//                 </span>
//               )}
//               <button
//                 onClick={() => setVerifyDismissed(true)}
//                 className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
//               >
//                 ✕
//               </button>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ── Book a class — prominent CTA ───────────────────────────────── */}
//       <motion.button
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         onClick={() => setPage("Classes")}
//         className="w-full mb-4 py-3.5 rounded-xl font-bold text-sm border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
//         style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//       >
//         <MI icon="fitness_center" size={18} />
//         Book a Class
//       </motion.button>

//       {/* ── Stats row — all 4 in one line ──────────────────────────────── */}
//       <div className="grid grid-cols-4 gap-2 mb-4">
//         {stats.map((s, i) => (
//           <motion.div
//             key={s.label}
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: i * 0.06 }}
//             className="bg-card border border-border rounded-xl p-3 text-center"
//           >
//             <div className="font-display text-2xl text-primary leading-none mb-0.5">
//               {s.value}
//             </div>
//             <div className="text-[10px] text-muted-foreground font-medium">
//               {s.label}
//             </div>
//           </motion.div>
//         ))}
//       </div>

//       {/* ── Rewards / Check-in progress ────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ delay: 0.3 }}
//         className="mk2-card mb-4"
//         style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//       >
//         <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
//           <div>
//             <div className="font-bold text-sm">Rewards Progress</div>
//             <div className="text-xs text-muted-foreground mt-0.5">
//               {rewardStatus.progressToNext} / {CHECKIN_MILESTONE} check-ins to
//               next reward
//             </div>
//           </div>
//           <div className="flex gap-2">
//             {hasPendingReward && (
//               <button
//                 onClick={() => setPage("Checkin")}
//                 className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer animate-pulse"
//                 style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//               >
//                 🎁 Claim Reward!
//               </button>
//             )}
//             <button
//               onClick={() => setPage("Checkin")}
//               className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer"
//               style={{
//                 background: "hsl(var(--secondary))",
//                 color: "hsl(var(--foreground))",
//                 border: "1px solid hsl(var(--border))",
//               }}
//             >
//               ✅ Check In
//             </button>
//           </div>
//         </div>
//         <div className="h-2 bg-secondary rounded-full overflow-hidden">
//           <motion.div
//             className="h-full rounded-full"
//             initial={{ width: 0 }}
//             animate={{ width: `${rewardStatus.pct}%` }}
//             transition={{ duration: 0.8, ease: "easeOut" }}
//             style={{ background: "hsl(20 100% 50%)" }}
//           />
//         </div>
//         <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
//           <span>{rewardStatus.total} total check-ins</span>
//           <span>
//             {rewardStatus.milestonesEarned} reward
//             {rewardStatus.milestonesEarned !== 1 ? "s" : ""} earned
//           </span>
//         </div>
//       </motion.div>

//       {/* ── Activity + News grid ────────────────────────────────────────── */}
//       <div
//         className={`grid gap-4 ${isTablet || isMobile ? "grid-cols-1" : "grid-cols-3"}`}
//       >
//         {/* Training Log */}
//         <div className="mk2-card">
//           <div className="flex items-center justify-between mb-3">
//             <div className="font-bold text-sm flex items-center gap-1.5">
//               <MI icon="bolt" size={16} /> Training Log
//             </div>
//             <Btn variant="ghost" size="sm" onClick={() => setPage("Workout")}>
//               + Log
//             </Btn>
//           </div>
//           {user.workouts.length === 0 ? (
//             <div className="text-muted-foreground text-xs py-3 text-center">
//               No sessions yet.{" "}
//               <span
//                 className="text-primary cursor-pointer font-bold"
//                 onClick={() => setPage("Workout")}
//               >
//                 Try AI Planner →
//               </span>
//             </div>
//           ) : (
//             <div className="flex flex-col gap-1">
//               {user.workouts
//                 .slice(-4)
//                 .reverse()
//                 .map((w: any, i: number) => (
//                   <div
//                     key={i}
//                     className="flex justify-between items-center py-1.5 border-b border-border text-xs"
//                   >
//                     <span className="font-medium text-foreground truncate max-w-[120px]">
//                       {w.type}
//                     </span>
//                     <span className="text-muted-foreground shrink-0">
//                       {w.duration}min
//                     </span>
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>

//         {/* Booked Classes */}
//         <div className="mk2-card">
//           <div className="flex items-center justify-between mb-3">
//             <div className="font-bold text-sm flex items-center gap-1.5">
//               <MI icon="fitness_center" size={16} /> Classes
//             </div>
//             <Btn variant="ghost" size="sm" onClick={() => setPage("Classes")}>
//               Book
//             </Btn>
//           </div>
//           {user.bookings.length === 0 ? (
//             <div className="text-muted-foreground text-xs py-3 text-center">
//               No classes booked.{" "}
//               <span
//                 className="text-primary cursor-pointer font-bold"
//                 onClick={() => setPage("Classes")}
//               >
//                 Browse →
//               </span>
//             </div>
//           ) : (
//             <div className="flex flex-col gap-1">
//               {user.bookings
//                 .slice(-4)
//                 .reverse()
//                 .map((b: any, i: number) => (
//                   <div
//                     key={i}
//                     className="flex justify-between items-center py-1.5 border-b border-border text-xs"
//                   >
//                     <span className="font-medium text-foreground truncate max-w-[120px]">
//                       {b.name}
//                     </span>
//                     <span className="text-muted-foreground shrink-0">
//                       {b.time}
//                     </span>
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>

//         {/* News */}
//         <div
//           className="mk2-card cursor-pointer hover:border-primary/30 transition-colors"
//           onClick={() => setPage("News")}
//         >
//           <div className="flex items-center justify-between mb-3">
//             <div className="font-bold text-sm flex items-center gap-1.5">
//               <MI icon="campaign" size={16} /> News & Events
//             </div>
//             <span className="text-[10px] text-primary font-bold">
//               View all →
//             </span>
//           </div>
//           <div className="flex flex-col gap-2">
//             {newsToShow.map((n: any, i: number) => (
//               <div
//                 key={i}
//                 className="flex items-center gap-2 py-1.5 border-b border-border"
//               >
//                 <span className="text-base shrink-0">{n.emoji}</span>
//                 <div className="flex-1 min-w-0">
//                   <div className="text-xs font-medium truncate text-foreground">
//                     {n.title}
//                   </div>
//                   <div className="text-[10px] text-muted-foreground">
//                     {n.date}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Quick tools ─────────────────────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5 }}
//         className={`grid gap-2 mt-4 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
//       >
//         {[
//           {
//             label: "AI Workout",
//             icon: "bolt",
//             page: "Workout",
//             required: "gold" as const,
//           },
//           {
//             label: "Leaderboard",
//             icon: "emoji_events",
//             page: "Leaderboard",
//             required: "silver" as const,
//           },
//           {
//             label: "InBody Scan",
//             icon: "monitor_heart",
//             page: "InBody",
//             required: "gold" as const,
//           },
//         ].map((a) => {
//           const locked = isLocked(a.required);
//           return (
//             <button
//               key={a.label}
//               onClick={() => setPage(a.page)}
//               className="bg-card border border-border rounded-xl flex items-center gap-2.5 py-3 px-4 cursor-pointer hover:border-primary/30 transition-all text-left w-full"
//               style={{ opacity: locked ? 0.6 : 1 }}
//             >
//               <MI icon={locked ? "lock" : a.icon} size={18} />
//               <span className="font-bold text-xs text-foreground">
//                 {a.label}
//               </span>
//               {locked && (
//                 <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground">
//                   {a.required}+
//                 </span>
//               )}
//             </button>
//           );
//         })}
//       </motion.div>
//     </div>
//   );
// }

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
