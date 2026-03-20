import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { GOALS, LEVELS } from "@/lib/constants";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

const MEMBERSHIP_CONFIG = {
  basic: { label: "Basic", color: "#9ca3af", price: "Free", emoji: "🔵" },
  silver: { label: "Silver", color: "#e2e8f0", price: "R19/mo", emoji: "⚪" },
  gold: {
    label: "Gold",
    color: "hsl(38 92% 50%)",
    price: "R49/mo",
    emoji: "🥇",
  },
} as const;

export function Account({ setPage }: { setPage?: (p: string) => void }) {
  const { user, updateUser, logout, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [name, setName] = useState(user?.name || "");
  const [goal, setGoal] = useState(user?.goal || "");
  const [level, setLevel] = useState(user?.level || "");
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!user) return null;

  const save = async () => {
    await updateUser({ ...user, name, goal, level });
    toast("Profile saved ✓", "success");
  };

  const sendReset = async () => {
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast("Reset email sent ✓ — check your inbox", "success");
    } catch {
      toast("Failed to send reset email", "error");
    }
    setResetting(false);
  };

  const membership = ((user as any).membership ??
    "basic") as keyof typeof MEMBERSHIP_CONFIG;
  const memberConfig = MEMBERSHIP_CONFIG[membership];
  const loyaltyTier =
    user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const loyaltyColor = {
    Gold: "hsl(38 92% 44%)",
    Silver: "#94a3b8",
    Bronze: "#a16207",
  }[loyaltyTier]!;
  const isNewUser =
    !user.workouts?.length && !user.bookings?.length && !user.checkIns?.length;

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle
        sub={`${user.email} · Firebase UID: ${user.uid?.slice(0, 12)}…`}
      >
        My <span className="text-primary">Account</span>
      </PageTitle>

      {/* Prominent Sign Out bar */}
      <div
        className="flex items-center justify-between mb-5 px-4 py-3 rounded-xl"
        style={{
          background: "hsl(0 84% 51% / 0.08)",
          border: "1px solid hsl(0 84% 51% / 0.2)",
        }}
      >
        <div>
          <div className="font-bold text-sm">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        <Btn variant="danger" onClick={logout}>
          Sign Out
        </Btn>
      </div>

      {/* Empty state for brand new users */}
      {isNewUser && (
        <div
          className="mk2-card mb-5 text-center py-8"
          style={{
            borderColor: "hsl(20 100% 50% / 0.3)",
            background: "hsl(20 100% 50% / 0.04)",
          }}
        >
          <div className="text-4xl mb-3">👋</div>
          <div
            className="font-display text-xl mb-1"
            style={{ color: "hsl(20 100% 50%)" }}
          >
            Welcome to MK2 Rivers!
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Your profile is set up. Here's what to do next:
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: "📅 Book a class", page: "Classes" },
              { label: "✅ Check in", page: "Checkin" },
              { label: "⚡ Try a workout", page: "Workout" },
              { label: "🏆 Log a PR", page: "PRLogbook" },
            ].map((item) => (
              <button
                key={item.page}
                onClick={() => setPage?.(item.page)}
                className="px-4 py-2 rounded-full font-body font-bold text-xs border-none cursor-pointer transition-all"
                style={{
                  background: "hsl(20 100% 50% / 0.15)",
                  color: "hsl(20 100% 50%)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3.5">Profile Settings</div>
          <label className="mk2-label">Name</label>
          <input
            className="mk2-input mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="mk2-label">Goal</label>
          <select
            className="mk2-select mb-3"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <label className="mk2-label">Level</label>
          <select
            className="mk2-select mb-5"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <div className="flex gap-2.5 flex-wrap items-center">
            <Btn variant="primary" onClick={save}>
              Save Changes
            </Btn>
            <button
              onClick={sendReset}
              disabled={resetting || resetSent}
              className="text-xs font-bold bg-transparent border-none cursor-pointer p-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              {resetSent
                ? "✓ Reset email sent"
                : resetting
                  ? "Sending…"
                  : "🔑 Reset password"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div
            className="mk2-card"
            style={{ borderLeft: `3px solid ${memberConfig.color}` }}
          >
            <div className="font-bold text-sm mb-2">Membership Plan</div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <Tag color={memberConfig.color}>
                {memberConfig.emoji} {memberConfig.label}
              </Tag>
              <span
                className="text-sm font-bold"
                style={{ color: memberConfig.color }}
              >
                {memberConfig.price}
              </span>
              <Tag color={loyaltyColor}>
                {loyaltyTier} Loyalty · {user.points} pts
              </Tag>
            </div>
            {membership === "basic" ? (
              <button
                onClick={() => setPage?.("Membership")}
                className="text-[11px] font-bold border-none bg-transparent cursor-pointer p-0"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                Upgrade → Silver (R19/mo) or Gold (R49/mo)
              </button>
            ) : (
              <button
                onClick={() => setPage?.("Membership")}
                className="text-[11px] font-bold border-none bg-transparent cursor-pointer p-0"
                style={{ color: memberConfig.color }}
              >
                Manage plan →
              </button>
            )}
          </div>

          <div className="mk2-card text-sm text-muted-foreground">
            <div className="font-bold text-foreground mb-2.5">
              Activity Summary
            </div>
            {isNewUser ? (
              <div className="text-muted-foreground text-xs leading-relaxed">
                No activity yet — start by booking a class or checking in at the
                gym! 💪
              </div>
            ) : (
              <div className="leading-[2.2]">
                🏋️ {user.workouts?.length ?? 0} workouts logged
                <br />
                📅 {user.bookings?.length ?? 0} classes booked
                <br />✅ {user.checkIns?.length ?? 0} check-ins
                <br />
                ⚖️ {user.weights?.length ?? 0} weight entries
              </div>
            )}
          </div>

          <div
            className="mk2-card text-xs text-muted-foreground"
            style={{
              background: "hsl(217 30% 5%)",
              borderColor: "hsl(217 91% 53% / 0.2)",
            }}
          >
            <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              ☁️ Firebase Status
            </div>
            <div className="leading-relaxed">
              Auth: <strong className="text-mk2-green">Firebase Auth ✓</strong>
              <br />
              Database:{" "}
              <strong className="text-mk2-green">
                Realtime DB (europe-west1) ✓
              </strong>
              <br />
              Project:{" "}
              <strong className="text-foreground">gym-pro-20ee6</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { GOALS, LEVELS } from "@/lib/constants";
// import { Btn } from "@/components/shared/Btn";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";

// export function Account() {
//   const { user, updateUser, logout, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [name, setName] = useState(user?.name || "");
//   const [goal, setGoal] = useState(user?.goal || "");
//   const [level, setLevel] = useState(user?.level || "");

//   if (!user) return null;

//   const save = async () => {
//     await updateUser({ ...user, name, goal, level });
//     toast("Profile saved ✓", "success");
//   };

//   const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
//   const tierColor = { Gold: "hsl(38 92% 44%)", Silver: "#94a3b8", Bronze: "#a16207" }[tier]!;

//   return (
//     <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
//       <PageTitle sub={`${user.email} · Firebase UID: ${user.uid?.slice(0, 12)}…`}>
//         My <span className="text-primary">Account</span>
//       </PageTitle>

//       <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
//         {/* Profile settings */}
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-3.5">Profile Settings</div>
//           <label className="mk2-label">Name</label>
//           <input className="mk2-input mb-3" value={name} onChange={(e) => setName(e.target.value)} />
//           <label className="mk2-label">Goal</label>
//           <select className="mk2-select mb-3" value={goal} onChange={(e) => setGoal(e.target.value)}>
//             {GOALS.map((g) => <option key={g}>{g}</option>)}
//           </select>
//           <label className="mk2-label">Level</label>
//           <select className="mk2-select mb-5" value={level} onChange={(e) => setLevel(e.target.value)}>
//             {LEVELS.map((l) => <option key={l}>{l}</option>)}
//           </select>
//           <div className="flex gap-2.5 flex-wrap">
//             <Btn variant="primary" onClick={save}>Save Changes</Btn>
//             <Btn variant="danger" onClick={logout}>Sign Out</Btn>
//           </div>
//         </div>

//         {/* Right column */}
//         <div className="flex flex-col gap-3.5">
//           <div className="mk2-card" style={{ borderLeft: `3px solid ${tierColor}` }}>
//             <div className="font-bold text-sm mb-2">Membership Status</div>
//             <div className="flex gap-2.5 items-center">
//               <Tag color={tierColor}>{tier} Member</Tag>
//               <span className="font-display text-2xl" style={{ color: tierColor }}>{user.points} pts</span>
//             </div>
//           </div>

//           <div className="mk2-card text-sm text-muted-foreground">
//             <div className="font-bold text-foreground mb-2.5">Activity Summary</div>
//             <div className="leading-[2.2]">
//               🏋️ {user.workouts.length} workouts logged<br />
//               📅 {user.bookings.length} classes booked<br />
//               ✅ {user.checkIns.length} check-ins<br />
//               ⚖️ {user.weights.length} weight entries
//             </div>
//           </div>

//           <div className="mk2-card text-xs text-muted-foreground" style={{ background: "hsl(217 30% 5%)", borderColor: "hsl(217 91% 53% / 0.2)" }}>
//             <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
//               <span>☁️</span> Firebase Status
//             </div>
//             <div className="leading-relaxed">
//               Auth: <strong className="text-mk2-green">Firebase Auth ✓</strong><br />
//               Database: <strong className="text-mk2-green">Firestore (europe-west1) ✓</strong><br />
//               Analytics: <strong className="text-mk2-green">Firebase Analytics ✓</strong><br />
//               Project: <strong className="text-foreground">gym-pro-20ee6</strong>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
