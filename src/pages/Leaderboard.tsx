import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { Tag } from "@/components/shared/Tag";
import { motion } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardUser {
  uid: string;
  name: string;
  points: number;
  checkIns: number;
  workouts: number;
  bookings: number;
  tier: string;
  color: string;
}

// Static competitions (can be extended later)
const COMPETITIONS = [
  {
    id: 1,
    name: "30-Day Check-In Challenge",
    ends: "1 Apr 2026",
    prize: "Free 3-month membership",
    metric: "Check-ins",
    active: true,
    color: "hsl(20 100% 50%)",
  },
  {
    id: 2,
    name: "Most Workouts — March",
    ends: "31 Mar 2026",
    prize: "R500 gym credit",
    metric: "Workouts logged",
    active: true,
    color: "hsl(263 85% 58%)",
  },
  {
    id: 3,
    name: "Points Sprint — Q1",
    ends: "31 Mar 2026",
    prize: "Gold membership upgrade",
    metric: "Points earned",
    active: true,
    color: "hsl(38 92% 44%)",
  },
];

const tierColor = (t: string) =>
  t === "Gold" ? "hsl(38 92% 44%)" : t === "Silver" ? "#94a3b8" : "#a16207";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTier(points: number): string {
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
}

// Format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Leaderboard Components ────────────────────────────────────────────────────
function OverallLeaderboard({
  users,
  currentUser,
}: {
  users: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
}) {
  const sorted = [...users].sort((a, b) => b.points - a.points);
  const topUsers = sorted.slice(0, 10);
  const userRank = currentUser
    ? sorted.findIndex((u) => u.uid === currentUser.uid) + 1
    : null;

  return (
    <div>
      {currentUser && userRank && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-5 border-l-[3px]"
          style={{ borderLeftColor: tierColor(currentUser.tier) }}
        >
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Ranking
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{userRank}
                </span>
                <div>
                  <div className="font-bold">{currentUser.name}</div>
                  <Tag color={tierColor(currentUser.tier)}>
                    {currentUser.tier} · {currentUser.points} pts
                  </Tag>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">
                Points to climb
              </div>
              <div className="text-sm font-bold text-primary">
                {userRank > 1
                  ? `+${sorted[userRank - 2]?.points - currentUser.points} pts`
                  : "👑 TOP!"}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        {topUsers.map((user, i) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="mk2-card flex items-center gap-3 py-3"
            style={{
              borderLeft: i < 3 ? `3px solid ${user.color}` : undefined,
            }}
          >
            <div className="font-display text-xl w-8 text-center shrink-0">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}️⃣`}
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{ background: user.color, color: "#000" }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{user.name}</div>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {user.checkIns} check-ins
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {user.workouts} workouts
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-display text-xl"
                style={{ color: user.color }}
              >
                {user.points}
              </div>
              <Tag color={tierColor(user.tier)}>{user.tier}</Tag>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DailyClassLeaderboard({
  bookingsCounts,
  currentUserId,
}: {
  bookingsCounts: Array<{ uid: string; name: string; count: number }>;
  currentUserId: string;
}) {
  const sorted = [...bookingsCounts].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);
  const userEntry = sorted.find((u) => u.uid === currentUserId);
  const userRank = userEntry ? sorted.indexOf(userEntry) + 1 : null;

  return (
    <div>
      {userEntry && userRank && (
        <div className="mk2-card mb-5 border-l-[3px] border-orange-500">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Your Daily Rank
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[48px] text-primary leading-none">
                  #{userRank}
                </span>
                <div>
                  <div className="font-bold">{userEntry.name}</div>
                  <Tag color="hsl(20 100% 50%)">
                    {userEntry.count} class{userEntry.count !== 1 ? "es" : ""}
                  </Tag>
                </div>
              </div>
            </div>
            {userRank > 1 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  To reach #{userRank - 1}
                </div>
                <div className="text-sm font-bold text-primary">
                  +{sorted[userRank - 2].count - userEntry.count + 1} more
                  classes
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {top.map((user, i) => (
          <div
            key={user.uid}
            className="mk2-card flex items-center gap-3 py-3"
            style={{
              borderLeft: i < 3 ? `3px solid hsl(20 100% 50%)` : undefined,
            }}
          >
            <div className="font-display text-xl w-8 text-center shrink-0">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}️⃣`}
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{ background: "hsl(20 100% 50%)", color: "#000" }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{user.name}</div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-display text-xl"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {user.count}
              </div>
              <div className="text-[10px] text-muted-foreground">classes</div>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No classes booked today — be the first!
        </div>
      )}
    </div>
  );
}

function ChallengesLeaderboard() {
  const { user } = useAuth();
  if (!user) return null;
  const userPoints = user.points;
  const userTier = getTier(userPoints);
  const gymRank = 1; // Placeholder – in real app, fetch from overall leaderboard

  return (
    <div>
      <div className="flex flex-col gap-4">
        {COMPETITIONS.map((comp, i) => (
          <motion.div
            key={comp.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="mk2-card"
            style={{ borderTop: `3px solid ${comp.color}` }}
          >
            <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-display text-xl tracking-wide">
                    {comp.name}
                  </div>
                  {comp.active && <Tag color={comp.color}>Active</Tag>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Ends: {comp.ends} · Metric: {comp.metric}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Prize</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: comp.color }}
                >
                  {comp.prize}
                </div>
              </div>
            </div>
            <div
              style={{
                height: 1,
                background: "hsl(var(--border))",
                margin: "12px 0",
              }}
            />
            <div className="text-xs text-muted-foreground">
              Your position:{" "}
              <strong className="text-foreground">#{gymRank}</strong> · Keep
              checking in and logging workouts to climb the ranks!
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mk2-card mt-5 bg-secondary/50">
        <div className="font-bold text-sm mb-2">How Competitions Work</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Every check-in, logged workout, and booked class earns you points.
          Winners are announced at the end of each competition period and prizes
          awarded at reception.
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Leaderboard() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [tab, setTab] = useState<"overall" | "daily" | "challenges">("overall");

  // State for dynamic leaderboards
  const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
  const [dailyBookings, setDailyBookings] = useState<
    Array<{ uid: string; name: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  if (!user) return null;

  // Fetch all users
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "mk2_users"), (snap) => {
      if (snap.exists()) {
        const usersData = snap.val();
        const users: LeaderboardUser[] = Object.entries(usersData).map(
          ([uid, data]: [string, any]) => ({
            uid,
            name: data.name || "Unnamed",
            points: data.points ?? 0,
            checkIns: data.checkIns?.length ?? 0,
            workouts: data.workouts?.length ?? 0,
            bookings: data.bookings?.length ?? 0,
            tier: getTier(data.points ?? 0),
            color: tierColor(getTier(data.points ?? 0)),
          }),
        );
        setAllUsers(users);
      } else {
        setAllUsers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch today's bookings for daily leaderboard
  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    const unsubscribe = onValue(ref(db, "class_bookings"), (snap) => {
      if (snap.exists()) {
        const allBookings = snap.val();
        // Count bookings per user for today
        const counts: Record<string, number> = {};
        Object.entries(allBookings).forEach(
          ([classKey, classBookings]: any) => {
            if (!classKey.endsWith(todayKey)) return; // only today's classes
            Object.keys(classBookings).forEach((uid) => {
              counts[uid] = (counts[uid] || 0) + 1;
            });
          },
        );
        // Map to leaderboard entries
        const list = Object.entries(counts).map(([uid, count]) => {
          const userInfo = allUsers.find((u) => u.uid === uid);
          return {
            uid,
            name: userInfo?.name || "Unknown",
            count,
          };
        });
        setDailyBookings(list);
      } else {
        setDailyBookings([]);
      }
    });
    return () => unsubscribe();
  }, [allUsers]); // re-run when users load

  const currentUser = allUsers.find((u) => u.uid === user.uid);

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Compete, earn, and rise through the ranks">
        Leader<span className="text-primary">board</span>
      </PageTitle>

      {/* Tab switcher */}
      <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-fit">
        {[
          { id: "overall", label: "🏆 Overall (12m)" },
          { id: "daily", label: "📅 Daily Class" },
          { id: "challenges", label: "🏁 Challenges" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading leaderboard...
        </div>
      ) : (
        <>
          {tab === "overall" && (
            <OverallLeaderboard
              users={allUsers}
              currentUser={currentUser || null}
            />
          )}
          {tab === "daily" && (
            <DailyClassLeaderboard
              bookingsCounts={dailyBookings}
              currentUserId={user.uid}
            />
          )}
          {tab === "challenges" && <ChallengesLeaderboard />}
        </>
      )}
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { Tag } from "@/components/shared/Tag";
// import { motion } from "framer-motion";

// const GYM_LEADERS = [
//   {
//     name: "Thabo M.",
//     points: 920,
//     checkIns: 92,
//     workouts: 87,
//     tier: "Gold",
//     color: "hsl(20 100% 50%)",
//     badge: "🥇",
//   },
//   {
//     name: "Nomsa K.",
//     points: 810,
//     checkIns: 81,
//     workouts: 74,
//     tier: "Gold",
//     color: "hsl(263 85% 58%)",
//     badge: "🥈",
//   },
//   {
//     name: "Coach Sipho",
//     points: 760,
//     checkIns: 76,
//     workouts: 70,
//     tier: "Gold",
//     color: "hsl(142 72% 37%)",
//     badge: "🥉",
//   },
//   {
//     name: "Ayanda M.",
//     points: 640,
//     checkIns: 64,
//     workouts: 58,
//     tier: "Gold",
//     color: "hsl(217 91% 53%)",
//     badge: "4️⃣",
//   },
//   {
//     name: "Busi T.",
//     points: 540,
//     checkIns: 54,
//     workouts: 49,
//     tier: "Gold",
//     color: "hsl(38 92% 44%)",
//     badge: "5️⃣",
//   },
//   {
//     name: "Mandla D.",
//     points: 420,
//     checkIns: 42,
//     workouts: 38,
//     tier: "Silver",
//     color: "hsl(187 85% 40%)",
//     badge: "6️⃣",
//   },
//   {
//     name: "Zanele P.",
//     points: 380,
//     checkIns: 38,
//     workouts: 34,
//     tier: "Silver",
//     color: "hsl(0 84% 51%)",
//     badge: "7️⃣",
//   },
//   {
//     name: "Siphamandla",
//     points: 310,
//     checkIns: 31,
//     workouts: 28,
//     tier: "Silver",
//     color: "hsl(263 85% 58%)",
//     badge: "8️⃣",
//   },
//   {
//     name: "Thandeka N.",
//     points: 260,
//     checkIns: 26,
//     workouts: 23,
//     tier: "Silver",
//     color: "hsl(20 100% 50%)",
//     badge: "9️⃣",
//   },
//   {
//     name: "Rethabile K.",
//     points: 190,
//     checkIns: 19,
//     workouts: 17,
//     tier: "Bronze",
//     color: "hsl(142 72% 37%)",
//     badge: "🔟",
//   },
// ];

// const COMPETITIONS = [
//   {
//     id: 1,
//     name: "30-Day Check-In Challenge",
//     ends: "1 Apr 2026",
//     prize: "Free 3-month membership",
//     metric: "Check-ins",
//     active: true,
//     color: "hsl(20 100% 50%)",
//   },
//   {
//     id: 2,
//     name: "Most Workouts — March",
//     ends: "31 Mar 2026",
//     prize: "R500 gym credit",
//     metric: "Workouts logged",
//     active: true,
//     color: "hsl(263 85% 58%)",
//   },
//   {
//     id: 3,
//     name: "Points Sprint — Q1",
//     ends: "31 Mar 2026",
//     prize: "Gold membership upgrade",
//     metric: "Points earned",
//     active: true,
//     color: "hsl(38 92% 44%)",
//   },
// ];

// const tierColor = (t: string) =>
//   t === "Gold" ? "hsl(38 92% 44%)" : t === "Silver" ? "#94a3b8" : "#a16207";

// export function Leaderboard() {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [tab, setTab] = useState<"gym" | "personal" | "competitions">("gym");

//   if (!user) return null;

//   const userTier =
//     user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const gymRank = GYM_LEADERS.filter((l) => l.points > user.points).length + 1;

//   const personalStats = [
//     {
//       label: "Total Points",
//       value: user.points,
//       accent: "hsl(20 100% 50%)",
//       icon: "🏆",
//     },
//     {
//       label: "Workouts Logged",
//       value: user.workouts.length,
//       accent: "hsl(217 91% 53%)",
//       icon: "🏋️",
//     },
//     {
//       label: "Check-Ins",
//       value: user.checkIns.length,
//       accent: "hsl(142 72% 37%)",
//       icon: "✅",
//     },
//     {
//       label: "Classes Booked",
//       value: user.bookings.length,
//       accent: "hsl(263 85% 58%)",
//       icon: "📅",
//     },
//   ];

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Compete, earn, and rise through the ranks">
//         Leader<span className="text-primary">board</span>
//       </PageTitle>

//       {/* Tab switcher */}
//       <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-fit">
//         {[
//           { id: "gym", label: "🏟️ Gym-Wide" },
//           { id: "personal", label: "👤 My Stats" },
//           { id: "competitions", label: "🏆 Competitions" },
//         ].map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setTab(t.id as any)}
//             className={`px-4 py-2 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150 ${
//               tab === t.id
//                 ? "bg-primary text-primary-foreground"
//                 : "bg-transparent text-muted-foreground hover:text-foreground"
//             }`}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* Gym-wide */}
//       {tab === "gym" && (
//         <div>
//           <motion.div
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="mk2-card mb-5 border-l-[3px]"
//             style={{ borderLeftColor: tierColor(userTier) }}
//           >
//             <div className="flex justify-between items-center flex-wrap gap-3">
//               <div>
//                 <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
//                   Your Ranking
//                 </div>
//                 <div className="flex items-center gap-3">
//                   <span className="font-display text-[48px] text-primary leading-none">
//                     #{gymRank}
//                   </span>
//                   <div>
//                     <div className="font-bold">{user.name}</div>
//                     <Tag color={tierColor(userTier)}>
//                       {userTier} · {user.points} pts
//                     </Tag>
//                   </div>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <div className="text-xs text-muted-foreground mb-1">
//                   Points to climb
//                 </div>
//                 <div className="text-sm font-bold text-primary">
//                   {gymRank > 1
//                     ? `+${GYM_LEADERS[gymRank - 2]?.points - user.points} pts`
//                     : "👑 TOP!"}
//                 </div>
//               </div>
//             </div>
//           </motion.div>

//           <div className="flex flex-col gap-2">
//             {GYM_LEADERS.map((leader, i) => (
//               <motion.div
//                 key={leader.name}
//                 initial={{ opacity: 0, x: -8 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: i * 0.04 }}
//                 className="mk2-card flex items-center gap-3 py-3"
//                 style={{
//                   borderLeft: i < 3 ? `3px solid ${leader.color}` : undefined,
//                 }}
//               >
//                 <div className="font-display text-xl w-8 text-center shrink-0">
//                   {leader.badge}
//                 </div>
//                 <div
//                   className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
//                   style={{ background: leader.color, color: "#000" }}
//                 >
//                   {leader.name[0]}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <div className="font-bold text-sm">{leader.name}</div>
//                   <div className="flex gap-2 mt-0.5 flex-wrap">
//                     <span className="text-[10px] text-muted-foreground">
//                       {leader.checkIns} check-ins
//                     </span>
//                     <span className="text-[10px] text-muted-foreground">
//                       {leader.workouts} workouts
//                     </span>
//                   </div>
//                 </div>
//                 <div className="text-right shrink-0">
//                   <div
//                     className="font-display text-xl"
//                     style={{ color: leader.color }}
//                   >
//                     {leader.points}
//                   </div>
//                   <Tag color={tierColor(leader.tier)}>{leader.tier}</Tag>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Personal */}
//       {tab === "personal" && (
//         <div>
//           <div className="grid grid-cols-2 gap-3 mb-5">
//             {personalStats.map((s, i) => (
//               <motion.div
//                 key={s.label}
//                 initial={{ opacity: 0, scale: 0.96 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 transition={{ delay: i * 0.08 }}
//                 className="mk2-card"
//                 style={{ borderLeft: `3px solid ${s.accent}` }}
//               >
//                 <div className="text-2xl mb-2">{s.icon}</div>
//                 <div className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-1">
//                   {s.label}
//                 </div>
//                 <div
//                   className="font-display text-[40px] leading-none"
//                   style={{ color: s.accent }}
//                 >
//                   {s.value}
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//           <div
//             className="mk2-card"
//             style={{ borderLeft: `3px solid ${tierColor(userTier)}` }}
//           >
//             <div className="font-bold text-sm mb-2">Gym Ranking</div>
//             <div className="flex items-center gap-4">
//               <div className="font-display text-[56px] text-primary leading-none">
//                 #{gymRank}
//               </div>
//               <div>
//                 <div className="text-sm text-muted-foreground">
//                   out of {GYM_LEADERS.length + 1} members
//                 </div>
//                 <Tag color={tierColor(userTier)} className="mt-1">
//                   {userTier} Member
//                 </Tag>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Competitions */}
//       {tab === "competitions" && (
//         <div>
//           <div className="flex flex-col gap-4">
//             {COMPETITIONS.map((comp, i) => (
//               <motion.div
//                 key={comp.id}
//                 initial={{ opacity: 0, y: 8 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.1 }}
//                 className="mk2-card"
//                 style={{ borderTop: `3px solid ${comp.color}` }}
//               >
//                 <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
//                   <div>
//                     <div className="flex items-center gap-2 mb-1">
//                       <div className="font-display text-xl tracking-wide">
//                         {comp.name}
//                       </div>
//                       {comp.active && <Tag color={comp.color}>Active</Tag>}
//                     </div>
//                     <div className="text-xs text-muted-foreground">
//                       Ends: {comp.ends} · Metric: {comp.metric}
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-xs text-muted-foreground mb-1">
//                       Prize
//                     </div>
//                     <div
//                       className="text-sm font-bold"
//                       style={{ color: comp.color }}
//                     >
//                       {comp.prize}
//                     </div>
//                   </div>
//                 </div>
//                 <div
//                   style={{
//                     height: 1,
//                     background: "hsl(var(--border))",
//                     margin: "12px 0",
//                   }}
//                 />
//                 <div className="text-xs text-muted-foreground">
//                   Your position:{" "}
//                   <strong className="text-foreground">#{gymRank}</strong> · Keep
//                   checking in and logging workouts to climb the ranks!
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//           <div className="mk2-card mt-5 bg-secondary/50">
//             <div className="font-bold text-sm mb-2">How Competitions Work</div>
//             <div className="text-xs text-muted-foreground leading-relaxed">
//               Every check-in, logged workout, and booked class earns you points.
//               Winners are announced at the end of each competition period and
//               prizes awarded at reception.
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
