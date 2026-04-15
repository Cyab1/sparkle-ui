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
  const [liveNews, setLiveNews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, "admin_news"), (snap) => {
      if (!snap.exists()) return;
      const items = Object.values(snap.val()) as any[];
      const sorted = items.sort(
        (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
      );
      setLiveNews(sorted.slice(0, 3));
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

      {/* ── Email verify banner ─────────────────────────────────────────── */}
      {showVerifyBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Please verify your email address to unlock all features.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {resendSent ? (
              <span className="text-[10px] text-green-500 font-bold">
                Sent!
              </span>
            ) : (
              <button
                onClick={resendVerification}
                disabled={resending}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-yellow-500/40 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 cursor-pointer"
              >
                {resending ? "Sending…" : "Resend"}
              </button>
            )}
            <button
              onClick={() => setVerifyDismissed(true)}
              className="text-muted-foreground text-sm bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
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

      {/* ── Loyalty Program / Check-in progress ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mk2-card mb-4"
        style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div>
            <div
              className="font-display text-base tracking-wide"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              Loyalty Program
            </div>
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

      {/* ── News & Events ──────────────────────────────────────────────── */}
      <div
        className="mk2-card cursor-pointer hover:border-primary/30 transition-colors mb-4"
        onClick={() => setPage("News")}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-display tracking-wide text-primary"
            style={{ fontSize: 15 }}
          >
            News & Events
          </span>
          <span className="text-[10px] text-primary font-bold">View all →</span>
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

      {/* ── Community ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="mk2-card cursor-pointer hover:border-primary/30 transition-colors mb-4"
        onClick={() => setPage("Community")}
        style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-display text-base tracking-wide"
              style={{ color: "hsl(20 100% 50%)" }}
            >
              Community
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Connect with fellow MK2R members
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "hsl(20 100% 50% / 0.15)" }}
          >
            <MI icon="groups" size={20} />
          </div>
        </div>
      </motion.div>

      {/* ── My Progress — PR Logbook + Leaderboard ──────────────────────── */}
      <div
        className="font-display tracking-wide mt-4 mb-2"
        style={{ color: "hsl(20 100% 50%)", fontSize: 16 }}
      >
        My Progress
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-2 mt-2"
      >
        {[
          {
            label: "PR Logbook",
            icon: "emoji_events",
            page: "PRLogbook",
          },
          {
            label: "Leaderboard",
            icon: "leaderboard",
            page: "Leaderboard",
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => setPage(a.page)}
            className="bg-card border border-border rounded-xl flex items-center gap-2.5 py-3 px-4 cursor-pointer hover:border-primary/30 transition-all text-left w-full"
          >
            <MI icon={a.icon} size={18} />
            <span
              className="font-display tracking-wide text-primary"
              style={{ fontSize: 14 }}
            >
              {a.label}
            </span>
          </button>
        ))}
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
//       {/* ── Welcome header ──────────────────────────────────────────────── */}
//       <div className="mb-5">
//         <div
//           className={`font-display tracking-[0.06em] leading-none ${isMobile ? "text-[28px]" : "text-[40px]"}`}
//         >
//           Welcome,{" "}
//           <span className="text-primary">{user.name.split(" ")[0]}</span>
//         </div>
//         <div className="flex items-center gap-2 mt-1 flex-wrap">
//           <span className="text-muted-foreground text-xs">
//             {user.goal} · {user.level}
//           </span>
//           <span
//             className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
//             style={{
//               background: `${memberConfig.color}20`,
//               color: memberConfig.color,
//               border: `1px solid ${memberConfig.color}40`,
//             }}
//           >
//             {memberConfig.emoji} {memberConfig.label}
//           </span>
//         </div>
//       </div>

//       {/* ── Stats row ──────────────────────────────────────────────────── */}
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

//       {/* ── Book a Class — hero CTA ────────────────────────────────────── */}
//       <motion.button
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.28 }}
//         onClick={() => setPage("Classes")}
//         className="w-full mb-4 rounded-2xl border-none cursor-pointer transition-all active:scale-[0.98] overflow-hidden"
//         style={{
//           background:
//             "linear-gradient(135deg, hsl(20 100% 50%) 0%, hsl(20 100% 38%) 100%)",
//           boxShadow: "0 4px 24px hsl(20 100% 50% / 0.35)",
//         }}
//       >
//         <div className="flex items-center justify-between px-5 py-4">
//           <div className="text-left">
//             <div className="font-display text-xl tracking-wide text-black leading-tight">
//               Book a Class
//             </div>
//             <div className="text-[11px] font-bold text-black/60 mt-0.5">
//               View today's schedule →
//             </div>
//           </div>
//           <div
//             className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
//             style={{ background: "rgba(0,0,0,0.15)" }}
//           >
//             <MI icon="fitness_center" size={22} />
//           </div>
//         </div>
//       </motion.button>

//       {/* ── Rewards / Check-in progress ────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ delay: 0.35 }}
//         className="mk2-card mb-4"
//         style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//       >
//         <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
//           <div>
//             <div
//               className="font-display text-base tracking-wide"
//               style={{ color: "hsl(20 100% 50%)" }}
//             >
//               Loyalty Program
//             </div>
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

//       {/* ── News & Events — full width ──────────────────────────────────── */}
//       <div
//         className="mk2-card cursor-pointer hover:border-primary/30 transition-colors mb-4"
//         onClick={() => setPage("News")}
//       >
//         <div className="flex items-center justify-between mb-3">
//           <span
//             className="font-display tracking-wide text-primary"
//             style={{ fontSize: 15 }}
//           >
//             News & Events
//           </span>
//           <span className="text-[10px] text-primary font-bold">
//             View all →
//           </span>
//         </div>
//         <div className="flex flex-col gap-2">
//           {newsToShow.map((n: any, i: number) => (
//             <div
//               key={i}
//               className="flex items-center gap-2 py-1.5 border-b border-border"
//             >
//               <span className="text-base shrink-0">{n.emoji}</span>
//               <div className="flex-1 min-w-0">
//                 <div className="text-xs font-medium truncate text-foreground">
//                   {n.title}
//                 </div>
//                 <div className="text-[10px] text-muted-foreground">
//                   {n.date}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* ── My Progress — PR Logbook + Leaderboard ──────────────────────── */}
//       <div
//         className="font-display tracking-wide mt-4 mb-2"
//         style={{ color: "hsl(20 100% 50%)", fontSize: 16 }}
//       >
//         My Progress
//       </div>
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5 }}
//         className="grid grid-cols-2 gap-2 mt-4"
//       >
//         {[
//           {
//             label: "PR Logbook",
//             icon: "emoji_events",
//             page: "PRLogbook",
//             required: "silver" as const,
//           },
//           {
//             label: "Leaderboard",
//             icon: "leaderboard",
//             page: "Leaderboard",
//             required: "silver" as const,
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
//               <span
//                 className="font-display tracking-wide text-primary"
//                 style={{ fontSize: 14 }}
//               >
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
