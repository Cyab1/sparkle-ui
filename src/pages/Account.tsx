import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { saveUser } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { PageTitle } from "@/components/shared/PageTitle";
import { Btn } from "@/components/shared/Btn";
import { motion } from "framer-motion";
import { GOALS, LEVELS } from "@/lib/constants";

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

export function Account({ setPage }: { setPage: (p: string) => void }) {
  const { user, setUser, logout, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [goal, setGoal] = useState(user.goal);
  const [level, setLevel] = useState(user.level);
  const [gender, setGender] = useState<"male" | "female" | "prefer_not_to_say">(
    (user as any).gender ?? "prefer_not_to_say",
  );
  const [photoUrl, setPhotoUrl] = useState((user as any).photoUrl || "");
  const [photoPreview, setPhotoPreview] = useState(
    (user as any).photoUrl || "",
  );
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);

  const membership = (user as any).membership ?? "basic";
  const memberColors = {
    basic: { color: "#9ca3af", label: "Basic" },
    silver: { color: "#e2e8f0", label: "Silver" },
    gold: { color: "hsl(38 92% 50%)", label: "Gold" },
  };
  const mc =
    memberColors[membership as keyof typeof memberColors] || memberColors.basic;

  const isNewUser =
    user.workouts.length === 0 &&
    user.bookings.length === 0 &&
    user.checkIns.length === 0;

  // ── Profile photo upload ──────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Photo must be under 2MB", "error");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setPhotoUrl(base64);
      setPhotoPreview(base64);
      setImgError(false);
      setUploading(false);
      toast("Photo ready — tap Save Changes to apply", "success");
    };
    reader.onerror = () => {
      toast("Failed to read photo", "error");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!name.trim()) return toast("Name cannot be empty", "error");
    setSaving(true);
    try {
      const updated = {
        ...user,
        name: name.trim(),
        goal,
        level,
        gender,
        photoUrl: photoUrl.trim(),
      };
      await saveUser(user.uid, {
        name: updated.name,
        goal: updated.goal,
        level: updated.level,
        gender: updated.gender,
        photoUrl: updated.photoUrl,
      });
      setUser(updated as any);
      toast("Profile updated ✓", "success");
    } catch {
      toast("Failed to save — try again", "error");
    }
    setSaving(false);
  };

  const resetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast("✓ Reset email sent — check your inbox", "success");
    } catch {
      toast("Could not send reset email", "error");
    }
  };

  const inp =
    "w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
  const lbl =
    "text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      {/* Sign out bar */}
      <div
        className="mk2-card mb-5 flex items-center gap-4"
        style={{ borderLeft: "3px solid hsl(0 84% 51%)", padding: "14px 18px" }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {user.email}
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0"
          style={{
            background: `${mc.color}20`,
            color: mc.color,
            border: `1px solid ${mc.color}40`,
          }}
        >
          {mc.label}
        </span>
        <Btn variant="danger" size="sm" onClick={logout}>
          Sign Out
        </Btn>
      </div>

      <PageTitle sub="Manage your profile and preferences">
        My <span className="text-primary">Account</span>
      </PageTitle>

      {isNewUser && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mk2-card mb-5"
          style={{
            borderColor: "hsl(20 100% 50% / 0.3)",
            background: "hsl(20 100% 50% / 0.04)",
          }}
        >
          <div className="font-bold text-sm mb-2 flex items-center gap-2">
            <span>🎉</span> Welcome to MK Two Rivers!
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Your account is all set up. Here's a few things to get started:
          </p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "📅 Book a Class", page: "Classes" },
              { label: "✅ Check In", page: "Checkin" },
              { label: "⚡ View Plans", page: "Membership" },
            ].map((a) => (
              <button
                key={a.page}
                onClick={() => setPage(a.page)}
                className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* ── Profile Photo ──────────────────────────────────────────────── */}
        <div
          className="mk2-card flex flex-col items-center text-center"
          style={{ borderTop: "2px solid hsl(20 100% 50%)" }}
        >
          <div className="font-bold text-sm mb-4 self-start flex items-center gap-2">
            <MI icon="account_circle" size={16} /> Profile Photo
          </div>
          <div className="relative mb-4">
            {photoPreview && !imgError ? (
              <img
                src={photoPreview}
                alt={user.name}
                onError={() => setImgError(true)}
                className="rounded-full object-cover"
                style={{
                  width: 88,
                  height: 88,
                  border: `3px solid ${mc.color}`,
                }}
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center font-display text-3xl"
                style={{
                  width: 88,
                  height: 88,
                  background: user.color,
                  color: "#000",
                  border: `3px solid ${mc.color}`,
                }}
              >
                {user.name[0]}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer hover:scale-110 transition-transform"
              style={{ background: mc.color }}
            >
              <MI icon="photo_camera" size={14} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />

          <div className="w-full text-left">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 mb-3 flex items-center justify-center gap-2"
              style={{ background: "hsl(20 100% 50%)", color: "#000" }}
            >
              <MI icon="upload" size={16} />
              {uploading ? "Processing…" : "Upload from Device"}
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex-1 h-px"
                style={{ background: "hsl(var(--border))" }}
              />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                or paste URL
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "hsl(var(--border))" }}
              />
            </div>

            <label className={lbl}>Photo URL</label>
            <input
              className={inp}
              placeholder="https://example.com/photo.jpg"
              value={photoUrl.startsWith("data:") ? "" : photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setImgError(false);
              }}
            />

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setPhotoPreview(photoUrl);
                  setImgError(false);
                }}
                className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer flex-1"
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                Preview
              </button>
              {photoUrl && (
                <button
                  onClick={() => {
                    setPhotoUrl("");
                    setPhotoPreview("");
                    setImgError(false);
                  }}
                  className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
                  style={{
                    background: "hsl(0 84% 51% / 0.1)",
                    color: "hsl(0 84% 51%)",
                    border: "1px solid hsl(0 84% 51% / 0.2)",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Max 2MB · JPG, PNG or WebP
            </p>
          </div>
        </div>

        {/* ── Profile Details ────────────────────────────────────────────── */}
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
        >
          <div className="font-bold text-sm mb-4 flex items-center gap-2">
            <MI icon="person" size={16} /> Profile Details
          </div>
          <div className="mb-3">
            <label className={lbl}>Full Name</label>
            <input
              className={inp}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className={lbl}>Email Address</label>
            <input
              className={inp}
              value={user.email}
              disabled
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={lbl}>Fitness Goal</label>
              <select
                className={inp}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                {GOALS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Level</label>
              <select
                className={inp}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className={lbl}>Gender</label>
            <div className="flex gap-2">
              {(
                [
                  { val: "male", label: "♂ Male" },
                  { val: "female", label: "♀ Female" },
                  { val: "prefer_not_to_say", label: "Prefer not to say" },
                ] as const
              ).map((g) => (
                <button
                  key={g.val}
                  type="button"
                  onClick={() => setGender(g.val)}
                  className="flex-1 py-2.5 rounded-xl font-body font-bold text-xs border-none cursor-pointer transition-all"
                  style={{
                    background:
                      gender === g.val
                        ? "hsl(20 100% 50%)"
                        : "hsl(var(--secondary))",
                    color:
                      gender === g.val
                        ? "#000"
                        : "hsl(var(--muted-foreground))",
                    border: `1px solid ${gender === g.val ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "hsl(20 100% 50%)" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={resetPassword}
              disabled={resetSent}
              className="px-4 py-3 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all"
              style={{
                background: "hsl(var(--secondary))",
                color: resetSent
                  ? "hsl(142 72% 37%)"
                  : "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {resetSent ? "✓ Email sent" : "🔑 Reset password"}
            </button>
          </div>
        </div>

        {/* ── Membership ────────────────────────────────────────────────── */}
        <div
          className="mk2-card"
          style={{ borderTop: `2px solid ${mc.color}` }}
        >
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            <MI icon="workspace_premium" size={16} /> Membership
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-2xl flex-shrink-0"
              style={{
                background: `${mc.color}15`,
                border: `1px solid ${mc.color}30`,
              }}
            >
              {membership === "gold"
                ? "🥇"
                : membership === "silver"
                  ? "⚪"
                  : "🔵"}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: mc.color }}>
                {mc.label} Member
              </div>
              <div className="text-xs text-muted-foreground">
                {membership === "basic"
                  ? "Free plan — upgrade to unlock more"
                  : membership === "silver"
                    ? "R19/mo or R199/yr"
                    : "R49/mo or R499/yr"}
              </div>
            </div>
          </div>
          {membership !== "gold" && (
            <button
              onClick={() => setPage("Membership")}
              className="w-full py-2.5 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95"
              style={{ background: "hsl(20 100% 50%)", color: "#000" }}
            >
              Upgrade Plan →
            </button>
          )}
        </div>

        {/* ── Activity Summary ───────────────────────────────────────────── */}
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(142 72% 37%)" }}
        >
          <div className="font-bold text-sm mb-3 flex items-center gap-2">
            <MI icon="bar_chart" size={16} /> Activity Summary
          </div>
          {isNewUser ? (
            <div className="text-xs text-muted-foreground leading-relaxed py-2 text-center">
              <div className="text-3xl mb-2">🏁</div>
              No activity yet — start by booking a class or checking in!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Workouts",
                  value: user.workouts.length,
                  color: "hsl(20 100% 50%)",
                },
                {
                  label: "Classes",
                  value: user.bookings.length,
                  color: "hsl(263 85% 58%)",
                },
                {
                  label: "Check-ins",
                  value: user.checkIns.length,
                  color: "hsl(142 72% 37%)",
                },
                {
                  label: "Points",
                  value: user.points,
                  color: "hsl(38 92% 44%)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: `${s.color}10`,
                    border: `1px solid ${s.color}20`,
                  }}
                >
                  <div
                    className="font-display text-2xl mb-0.5"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// import { useState, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { saveUser } from "@/lib/firebase";
// import { auth } from "@/lib/firebase";
// import { sendPasswordResetEmail } from "firebase/auth";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { Btn } from "@/components/shared/Btn";
// import { motion } from "framer-motion";
// import { GOALS, LEVELS } from "@/lib/constants";

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

// export function Account({ setPage }: { setPage: (p: string) => void }) {
//   const { user, setUser, logout, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   if (!user) return null;

//   const [name, setName] = useState(user.name);
//   const [goal, setGoal] = useState(user.goal);
//   const [level, setLevel] = useState(user.level);
//   const [gender, setGender] = useState<"male" | "female" | "prefer_not_to_say">(
//     (user as any).gender ?? "prefer_not_to_say",
//   );
//   const [photoUrl, setPhotoUrl] = useState((user as any).photoUrl || "");
//   const [photoPreview, setPhotoPreview] = useState(
//     (user as any).photoUrl || "",
//   );
//   const [saving, setSaving] = useState(false);
//   const [resetSent, setResetSent] = useState(false);
//   const [imgError, setImgError] = useState(false);
//   const [uploading, setUploading] = useState(false);

//   const membership = (user as any).membership ?? "basic";
//   const memberColors = {
//     basic: { color: "#9ca3af", label: "Basic" },
//     silver: { color: "#e2e8f0", label: "Silver" },
//     gold: { color: "hsl(38 92% 50%)", label: "Gold" },
//   };
//   const mc =
//     memberColors[membership as keyof typeof memberColors] || memberColors.basic;

//   const isNewUser =
//     user.workouts.length === 0 &&
//     user.bookings.length === 0 &&
//     user.checkIns.length === 0;

//   const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     if (file.size > 2 * 1024 * 1024) {
//       toast("Photo must be under 2MB", "error");
//       return;
//     }
//     setUploading(true);
//     const reader = new FileReader();
//     reader.onload = (ev) => {
//       const base64 = ev.target?.result as string;
//       setPhotoUrl(base64);
//       setPhotoPreview(base64);
//       setImgError(false);
//       setUploading(false);
//       toast("Photo ready — tap Save Changes to apply", "success");
//     };
//     reader.onerror = () => {
//       toast("Failed to read photo", "error");
//       setUploading(false);
//     };
//     reader.readAsDataURL(file);
//   };

//   const save = async () => {
//     if (!name.trim()) return toast("Name cannot be empty", "error");
//     setSaving(true);
//     try {
//       const updated = {
//         ...user,
//         name: name.trim(),
//         goal,
//         level,
//         gender,
//         photoUrl: photoUrl.trim(),
//       };
//       await saveUser(user.uid, updated);
//       setUser(updated as any);
//       toast("Profile updated ✓", "success");
//     } catch {
//       toast("Failed to save — try again", "error");
//     }
//     setSaving(false);
//   };

//   const resetPassword = async () => {
//     try {
//       await sendPasswordResetEmail(auth, user.email);
//       setResetSent(true);
//       toast("✓ Reset email sent — check your inbox", "success");
//     } catch {
//       toast("Could not send reset email", "error");
//     }
//   };

//   const inp =
//     "w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors font-body";
//   const lbl =
//     "text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5";

//   return (
//     <div
//       className={`max-w-[860px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       {/* Sign out bar */}
//       <div
//         className="mk2-card mb-5 flex items-center gap-4"
//         style={{ borderLeft: "3px solid hsl(0 84% 51%)", padding: "14px 18px" }}
//       >
//         <div className="flex-1 min-w-0">
//           <div className="font-bold text-sm truncate">{user.name}</div>
//           <div className="text-xs text-muted-foreground truncate">
//             {user.email}
//           </div>
//         </div>
//         <span
//           className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0"
//           style={{
//             background: `${mc.color}20`,
//             color: mc.color,
//             border: `1px solid ${mc.color}40`,
//           }}
//         >
//           {mc.label}
//         </span>
//         <Btn variant="danger" size="sm" onClick={logout}>
//           Sign Out
//         </Btn>
//       </div>

//       <PageTitle sub="Manage your profile and preferences">
//         My <span className="text-primary">Account</span>
//       </PageTitle>

//       {isNewUser && (
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mk2-card mb-5"
//           style={{
//             borderColor: "hsl(20 100% 50% / 0.3)",
//             background: "hsl(20 100% 50% / 0.04)",
//           }}
//         >
//           <div className="font-bold text-sm mb-2 flex items-center gap-2">
//             <span>🎉</span> Welcome to MK Two Rivers!
//           </div>
//           <p className="text-xs text-muted-foreground leading-relaxed mb-3">
//             Your account is all set up. Here's a few things to get started:
//           </p>
//           <div className="flex gap-2 flex-wrap">
//             {[
//               { label: "📅 Book a Class", page: "Classes" },
//               { label: "✅ Check In", page: "Checkin" },
//               { label: "⚡ View Plans", page: "Membership" },
//             ].map((a) => (
//               <button
//                 key={a.page}
//                 onClick={() => setPage(a.page)}
//                 className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
//                 style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//               >
//                 {a.label}
//               </button>
//             ))}
//           </div>
//         </motion.div>
//       )}

//       <div className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
//         {/* Profile photo */}
//         <div
//           className="mk2-card flex flex-col items-center text-center"
//           style={{ borderTop: "2px solid hsl(20 100% 50%)" }}
//         >
//           <div className="font-bold text-sm mb-4 self-start flex items-center gap-2">
//             <MI icon="account_circle" size={16} /> Profile Photo
//           </div>
//           <div className="relative mb-4">
//             {photoPreview && !imgError ? (
//               <img
//                 src={photoPreview}
//                 alt={user.name}
//                 onError={() => setImgError(true)}
//                 className="rounded-full object-cover"
//                 style={{
//                   width: 88,
//                   height: 88,
//                   border: `3px solid ${mc.color}`,
//                 }}
//               />
//             ) : (
//               <div
//                 className="rounded-full flex items-center justify-center font-display text-3xl"
//                 style={{
//                   width: 88,
//                   height: 88,
//                   background: user.color,
//                   color: "#000",
//                   border: `3px solid ${mc.color}`,
//                 }}
//               >
//                 {user.name[0]}
//               </div>
//             )}
//             <button
//               onClick={() => fileInputRef.current?.click()}
//               className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer hover:scale-110 transition-transform"
//               style={{ background: mc.color }}
//             >
//               <MI icon="photo_camera" size={14} />
//             </button>
//           </div>

//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/jpeg,image/png,image/webp"
//             onChange={handlePhotoUpload}
//             style={{ display: "none" }}
//           />

//           <div className="w-full text-left">
//             <button
//               onClick={() => fileInputRef.current?.click()}
//               disabled={uploading}
//               className="w-full py-2.5 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 mb-3 flex items-center justify-center gap-2"
//               style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//             >
//               <MI icon="upload" size={16} />
//               {uploading ? "Processing…" : "Upload from Device"}
//             </button>

//             <div className="flex items-center gap-2 mb-3">
//               <div
//                 className="flex-1 h-px"
//                 style={{ background: "hsl(var(--border))" }}
//               />
//               <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
//                 or paste URL
//               </span>
//               <div
//                 className="flex-1 h-px"
//                 style={{ background: "hsl(var(--border))" }}
//               />
//             </div>

//             <label className={lbl}>Photo URL</label>
//             <input
//               className={inp}
//               placeholder="https://example.com/photo.jpg"
//               value={photoUrl.startsWith("data:") ? "" : photoUrl}
//               onChange={(e) => {
//                 setPhotoUrl(e.target.value);
//                 setImgError(false);
//               }}
//             />

//             <div className="flex gap-2 mt-2">
//               <button
//                 onClick={() => {
//                   setPhotoPreview(photoUrl);
//                   setImgError(false);
//                 }}
//                 className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer flex-1"
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   color: "hsl(var(--foreground))",
//                   border: "1px solid hsl(var(--border))",
//                 }}
//               >
//                 Preview
//               </button>
//               {photoUrl && (
//                 <button
//                   onClick={() => {
//                     setPhotoUrl("");
//                     setPhotoPreview("");
//                     setImgError(false);
//                   }}
//                   className="text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
//                   style={{
//                     background: "hsl(0 84% 51% / 0.1)",
//                     color: "hsl(0 84% 51%)",
//                     border: "1px solid hsl(0 84% 51% / 0.2)",
//                   }}
//                 >
//                   Remove
//                 </button>
//               )}
//             </div>
//             <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
//               Max 2MB · JPG, PNG or WebP
//             </p>
//           </div>
//         </div>

//         {/* Profile details */}
//         <div
//           className="mk2-card"
//           style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
//         >
//           <div className="font-bold text-sm mb-4 flex items-center gap-2">
//             <MI icon="person" size={16} /> Profile Details
//           </div>
//           <div className="mb-3">
//             <label className={lbl}>Full Name</label>
//             <input
//               className={inp}
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//             />
//           </div>
//           <div className="mb-3">
//             <label className={lbl}>Email Address</label>
//             <input
//               className={inp}
//               value={user.email}
//               disabled
//               style={{ opacity: 0.5, cursor: "not-allowed" }}
//             />
//           </div>
//           <div className="grid grid-cols-2 gap-3 mb-4">
//             <div>
//               <label className={lbl}>Fitness Goal</label>
//               <select
//                 className={inp}
//                 value={goal}
//                 onChange={(e) => setGoal(e.target.value)}
//               >
//                 {GOALS.map((g) => (
//                   <option key={g}>{g}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className={lbl}>Level</label>
//               <select
//                 className={inp}
//                 value={level}
//                 onChange={(e) => setLevel(e.target.value)}
//               >
//                 {LEVELS.map((l) => (
//                   <option key={l}>{l}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//           <div className="mb-4">
//             <label className={lbl}>Gender</label>
//             <div className="flex gap-2">
//               {(
//                 [
//                   { val: "male", label: "♂ Male" },
//                   { val: "female", label: "♀ Female" },
//                   { val: "prefer_not_to_say", label: "Prefer not to say" },
//                 ] as const
//               ).map((g) => (
//                 <button
//                   key={g.val}
//                   type="button"
//                   onClick={() => setGender(g.val)}
//                   className="flex-1 py-2.5 rounded-xl font-body font-bold text-xs border-none cursor-pointer transition-all"
//                   style={{
//                     background:
//                       gender === g.val
//                         ? "hsl(20 100% 50%)"
//                         : "hsl(var(--secondary))",
//                     color:
//                       gender === g.val
//                         ? "#000"
//                         : "hsl(var(--muted-foreground))",
//                     border: `1px solid ${gender === g.val ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                   }}
//                 >
//                   {g.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <div className="flex gap-2 flex-wrap">
//             <button
//               onClick={save}
//               disabled={saving}
//               className="flex-1 py-3 rounded-xl font-body font-bold text-sm text-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
//               style={{ background: "hsl(20 100% 50%)" }}
//             >
//               {saving ? "Saving…" : "Save Changes"}
//             </button>
//             <button
//               onClick={resetPassword}
//               disabled={resetSent}
//               className="px-4 py-3 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all"
//               style={{
//                 background: "hsl(var(--secondary))",
//                 color: resetSent
//                   ? "hsl(142 72% 37%)"
//                   : "hsl(var(--foreground))",
//                 border: "1px solid hsl(var(--border))",
//               }}
//             >
//               {resetSent ? "✓ Email sent" : "🔑 Reset password"}
//             </button>
//           </div>
//         </div>

//         {/* Membership */}
//         <div
//           className="mk2-card"
//           style={{ borderTop: `2px solid ${mc.color}` }}
//         >
//           <div className="font-bold text-sm mb-3 flex items-center gap-2">
//             <MI icon="workspace_premium" size={16} /> Membership
//           </div>
//           <div className="flex items-center gap-3 mb-3">
//             <div
//               className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-2xl flex-shrink-0"
//               style={{
//                 background: `${mc.color}15`,
//                 border: `1px solid ${mc.color}30`,
//               }}
//             >
//               {membership === "gold"
//                 ? "🥇"
//                 : membership === "silver"
//                   ? "⚪"
//                   : "🔵"}
//             </div>
//             <div>
//               <div className="font-bold text-sm" style={{ color: mc.color }}>
//                 {mc.label} Member
//               </div>
//               <div className="text-xs text-muted-foreground">
//                 {membership === "basic"
//                   ? "Free plan — upgrade to unlock more"
//                   : membership === "silver"
//                     ? "R19/mo or R199/yr"
//                     : "R49/mo or R499/yr"}
//               </div>
//             </div>
//           </div>
//           {membership !== "gold" && (
//             <button
//               onClick={() => setPage("Membership")}
//               className="w-full py-2.5 rounded-xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95"
//               style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//             >
//               Upgrade Plan →
//             </button>
//           )}
//         </div>

//         {/* Activity summary */}
//         <div
//           className="mk2-card"
//           style={{ borderTop: "2px solid hsl(142 72% 37%)" }}
//         >
//           <div className="font-bold text-sm mb-3 flex items-center gap-2">
//             <MI icon="bar_chart" size={16} /> Activity Summary
//           </div>
//           {isNewUser ? (
//             <div className="text-xs text-muted-foreground leading-relaxed py-2 text-center">
//               <div className="text-3xl mb-2">🏁</div>
//               No activity yet — start by booking a class or checking in!
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 gap-3">
//               {[
//                 {
//                   label: "Workouts",
//                   value: user.workouts.length,
//                   color: "hsl(20 100% 50%)",
//                 },
//                 {
//                   label: "Classes",
//                   value: user.bookings.length,
//                   color: "hsl(263 85% 58%)",
//                 },
//                 {
//                   label: "Check-ins",
//                   value: user.checkIns.length,
//                   color: "hsl(142 72% 37%)",
//                 },
//                 {
//                   label: "Points",
//                   value: user.points,
//                   color: "hsl(38 92% 44%)",
//                 },
//               ].map((s) => (
//                 <div
//                   key={s.label}
//                   className="rounded-xl p-3 text-center"
//                   style={{
//                     background: `${s.color}10`,
//                     border: `1px solid ${s.color}20`,
//                   }}
//                 >
//                   <div
//                     className="font-display text-2xl mb-0.5"
//                     style={{ color: s.color }}
//                   >
//                     {s.value}
//                   </div>
//                   <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                     {s.label}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
