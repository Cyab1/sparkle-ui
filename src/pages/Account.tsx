import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { GOALS, LEVELS } from "@/lib/constants";
import { Btn } from "@/components/shared/Btn";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";

export function Account() {
  const { user, updateUser, logout, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [goal, setGoal] = useState(user.goal);
  const [level, setLevel] = useState(user.level);

  const save = async () => {
    await updateUser({ ...user, name, goal, level });
    toast("Profile saved ✓", "success");
  };

  const tier = user.points >= 500 ? "Gold" : user.points >= 200 ? "Silver" : "Bronze";
  const tierColor = { Gold: "hsl(38 92% 44%)", Silver: "#94a3b8", Bronze: "#a16207" }[tier]!;

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub={`${user.email} · Firebase UID: ${user.uid?.slice(0, 12)}…`}>
        My <span className="text-primary">Account</span>
      </PageTitle>

      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Profile settings */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-3.5">Profile Settings</div>
          <label className="mk2-label">Name</label>
          <input className="mk2-input mb-3" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mk2-label">Goal</label>
          <select className="mk2-select mb-3" value={goal} onChange={(e) => setGoal(e.target.value)}>
            {GOALS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <label className="mk2-label">Level</label>
          <select className="mk2-select mb-5" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <div className="flex gap-2.5 flex-wrap">
            <Btn variant="primary" onClick={save}>Save Changes</Btn>
            <Btn variant="danger" onClick={logout}>Sign Out</Btn>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          <div className="mk2-card" style={{ borderLeft: `3px solid ${tierColor}` }}>
            <div className="font-bold text-sm mb-2">Membership Status</div>
            <div className="flex gap-2.5 items-center">
              <Tag color={tierColor}>{tier} Member</Tag>
              <span className="font-display text-2xl" style={{ color: tierColor }}>{user.points} pts</span>
            </div>
          </div>

          <div className="mk2-card text-sm text-muted-foreground">
            <div className="font-bold text-foreground mb-2.5">Activity Summary</div>
            <div className="leading-[2.2]">
              🏋️ {user.workouts.length} workouts logged<br />
              📅 {user.bookings.length} classes booked<br />
              ✅ {user.checkIns.length} check-ins<br />
              ⚖️ {user.weights.length} weight entries
            </div>
          </div>

          <div className="mk2-card text-xs text-muted-foreground" style={{ background: "hsl(217 30% 5%)", borderColor: "hsl(217 91% 53% / 0.2)" }}>
            <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <span>☁️</span> Firebase Status
            </div>
            <div className="leading-relaxed">
              Auth: <strong className="text-mk2-green">Firebase Auth ✓</strong><br />
              Database: <strong className="text-mk2-green">Firestore (europe-west1) ✓</strong><br />
              Analytics: <strong className="text-mk2-green">Firebase Analytics ✓</strong><br />
              Project: <strong className="text-foreground">gym-pro-20ee6</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
