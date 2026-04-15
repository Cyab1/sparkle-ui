import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";
import { ref, push, set, onValue } from "firebase/database";
import { getRewardStatus } from "./Dashboard";

// ── Constants ─────────────────────────────────────────────────────────────────
const CHECKIN_MILESTONE = 40;
const REWARD_EXPIRY_DAYS = 60;

// ── Unique code generator ─────────────────────────────────────────────────────
function generateCode(): string {
  return `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// ── Simple QR-like code display (text based) ──────────────────────────────────
function RedemptionCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="text-center">
      <div
        className="font-display text-2xl tracking-widest py-4 px-6 rounded-xl mb-2 select-all"
        style={{
          background: "hsl(20 100% 50% / 0.1)",
          border: "2px solid hsl(20 100% 50% / 0.4)",
          color: "hsl(20 100% 50%)",
        }}
      >
        {code}
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
        style={{
          background: "hsl(var(--secondary))",
          color: "hsl(var(--foreground))",
        }}
      >
        {copied ? "✓ Copied!" : "Copy Code"}
      </button>
      <div className="text-xs text-muted-foreground mt-2">
        Show this code at reception to redeem your reward
      </div>
    </div>
  );
}

export function CheckIn() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [rewardChoice, setRewardChoice] = useState<"inbody" | "buddy" | null>(
    null,
  );
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [rewards, setRewards] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");

  const {
    nearGym,
    distanceM,
    loading: geoLoading,
    error: geoError,
    requestLocation,
  } = useGeolocation();

  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, `mk2_users/${user.uid}/rewards`), (snap) => {
      setRewards(snap.val() ?? {});
    });
  }, [user?.uid]);

  if (!user) return null;

  const today = new Date().toLocaleDateString("en-ZA");
  const checkedToday = user.checkIns.some((c: any) => c.date === today);
  const rewardStatus = getRewardStatus(user.checkIns, rewards);
  const pendingRewards = Object.entries(rewards).filter(
    ([, r]) => r.status === "pending" && Date.now() < r.expiresAt,
  );
  const expiredRewards = Object.entries(rewards).filter(
    ([, r]) => r.status === "pending" && Date.now() >= r.expiresAt,
  );
  const redeemedRewards = Object.entries(rewards).filter(
    ([, r]) => r.status === "redeemed",
  );

  // ── Check in ──────────────────────────────────────────────────────────────
  const doCheckIn = async () => {
    if (checkedToday) return toast("Already checked in today!", "error");
    if (!nearGym)
      return toast(
        "You must be at MK2R Ruimsig to check in (within 20m)",
        "error",
      );

    setLoading(true);
    const newCheckIns = [
      ...user.checkIns,
      {
        date: today,
        time: new Date().toLocaleTimeString("en-ZA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];

    const newTotal = newCheckIns.length;
    const newMilestones = Math.floor(newTotal / CHECKIN_MILESTONE);
    const oldMilestones = Math.floor(user.checkIns.length / CHECKIN_MILESTONE);

    const updated = {
      ...user,
      points: user.points + 10,
      checkIns: newCheckIns,
    };
    await updateUser(updated);
    logEvent("gym_checkin", { points: updated.points });

    // If new milestone reached, create a reward
    if (newMilestones > oldMilestones) {
      const code = generateCode();
      const earnedAt = Date.now();
      const expiresAt = earnedAt + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      await push(ref(db, `mk2_users/${user.uid}/rewards`), {
        status: "pending",
        earnedAt,
        expiresAt,
        redemptionCode: code,
        checkInMilestone: newMilestones * CHECKIN_MILESTONE,
        type: null, // chosen at redemption
      });
      toast(
        `🎉 ${newTotal} check-ins! You've earned a reward — choose below!`,
        "success",
      );
      setShowRewardModal(true);
    } else {
      toast(
        `Checked in! +10 points 💪 (${newTotal % CHECKIN_MILESTONE}/${CHECKIN_MILESTONE} to next reward)`,
        "success",
      );
    }

    setLoading(false);
  };

  // ── Redeem reward ─────────────────────────────────────────────────────────
  const redeemReward = async (rewardId: string) => {
    if (!rewardChoice) return toast("Choose your reward first", "error");
    setRedeeming(true);
    try {
      await set(ref(db, `mk2_users/${user.uid}/rewards/${rewardId}`), {
        ...rewards[rewardId],
        status: "redeemed",
        type: rewardChoice,
        redeemedAt: Date.now(),
      });
      toast(`🎁 Reward redeemed! Show your code at reception.`, "success");
      setShowRewardModal(false);
      setRewardChoice(null);
    } catch {
      toast("Redemption failed — try again", "error");
    }
    setRedeeming(false);
  };

  // ── Mark expired rewards ──────────────────────────────────────────────────
  useEffect(() => {
    expiredRewards.forEach(async ([id, r]) => {
      await set(ref(db, `mk2_users/${user.uid}/rewards/${id}`), {
        ...r,
        status: "expired",
      });
    });
  }, [expiredRewards.length]);

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Check in at the gym · Earn rewards every 40 visits">
        Gym <span className="text-primary">Check-In</span>
      </PageTitle>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div
        className="flex gap-1.5 p-1 rounded-xl w-fit mb-5"
        style={{ background: "hsl(var(--secondary))" }}
      >
        {[
          { id: "checkin", label: "✅ Check In" },
          {
            id: "history",
            label: `🎁 Rewards${pendingRewards.length > 0 ? ` (${pendingRewards.length})` : ""}`,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer font-body"
            style={{
              background:
                activeTab === t.id ? "hsl(20 100% 50%)" : "transparent",
              color:
                activeTab === t.id ? "#000" : "hsl(var(--muted-foreground))",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CHECK IN TAB                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "checkin" && (
        <>
          {/* ── Non-member options ─────────────────────────────────────── */}
          <div
            className="mb-4 rounded-xl p-4"
            style={{
              background: "hsl(20 100% 50% / 0.05)",
              border: "1px solid hsl(20 100% 50% / 0.2)",
            }}
          >
            <div className="font-bold text-sm mb-1">Not a member yet?</div>
            <div className="text-xs text-muted-foreground mb-3">
              Come check us out — no commitment needed.
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                href="https://wa.me/27000000000?text=Hi%2C%20I%27d%20like%20to%20book%20a%20trial%20at%20MK2%20Rivers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
                style={{
                  background: "hsl(142 72% 37%)",
                  color: "#fff",
                  minWidth: 140,
                }}
              >
                🏋️ Book a Trial
              </a>
              <a
                href="https://wa.me/27000000000?text=Hi%2C%20I%27d%20like%20to%20do%20a%20drop-in%20session%20at%20MK2%20Rivers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                  minWidth: 140,
                }}
              >
                🚶 Drop-In Session
              </a>
            </div>
          </div>

          {/* Location status */}
          <div
            className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
            style={{
              background: nearGym
                ? "hsl(142 72% 37% / 0.08)"
                : "hsl(20 100% 50% / 0.08)",
              border: `1px solid ${nearGym ? "hsl(142 72% 37% / 0.25)" : "hsl(20 100% 50% / 0.2)"}`,
            }}
          >
            <span
              className="material-symbols-rounded text-xl"
              style={{
                color: nearGym ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
              }}
            >
              {nearGym ? "location_on" : "location_off"}
            </span>
            <div className="flex-1 text-xs">
              {geoLoading ? (
                <span className="text-muted-foreground">
                  Detecting location…
                </span>
              ) : geoError ? (
                <span style={{ color: "hsl(20 100% 50%)" }}>
                  Location error — {geoError}
                </span>
              ) : nearGym ? (
                <span style={{ color: "hsl(142 72% 37%)" }}>
                  ✓ You're at MK2R Ruimsig — ready!
                </span>
              ) : distanceM !== null ? (
                <span style={{ color: "hsl(20 100% 50%)" }}>
                  {distanceM}m from gym — must be within 20m
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Tap Enable to detect location
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
            {/* Check-in button card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mk2-card text-center"
              style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
            >
              <div
                className="font-display leading-none mb-1.5"
                style={{
                  fontSize: 72,
                  color: checkedToday ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
                }}
              >
                {checkedToday ? "✓" : user.checkIns.length}
              </div>
              <div className="font-bold text-sm mb-1">
                {checkedToday ? "Checked in today!" : "Total check-ins"}
              </div>
              <div className="text-muted-foreground text-xs mb-4">
                {checkedToday
                  ? "Come back tomorrow for more points"
                  : "Must be at MK2R Ruimsig"}
              </div>
              <Btn
                variant={checkedToday || !nearGym ? "subtle" : "primary"}
                size="lg"
                onClick={doCheckIn}
                disabled={checkedToday || loading || !nearGym}
                full
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

            {/* Reward progress card */}
            <div
              className="mk2-card"
              style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
            >
              <div className="font-bold text-sm mb-1">Loyalty Program</div>
              <div className="text-xs text-muted-foreground mb-3">
                Every {CHECKIN_MILESTONE} check-ins earns a reward
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${rewardStatus.pct}%` }}
                  transition={{ duration: 0.8 }}
                  style={{ background: "hsl(20 100% 50%)" }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-4">
                <span>
                  {rewardStatus.progressToNext} / {CHECKIN_MILESTONE}
                </span>
                <span>
                  {CHECKIN_MILESTONE - rewardStatus.progressToNext} to go
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Total", value: rewardStatus.total },
                  { label: "Earned", value: rewardStatus.milestonesEarned },
                  { label: "Redeemed", value: rewardStatus.rewardsRedeemed },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-secondary rounded-lg p-2 text-center"
                  >
                    <div className="font-display text-xl text-primary">
                      {s.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending reward alert */}
              {pendingRewards.length > 0 && (
                <button
                  onClick={() => setActiveTab("history")}
                  className="w-full py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer animate-pulse"
                  style={{ background: "hsl(20 100% 50%)", color: "#000" }}
                >
                  🎁 {pendingRewards.length} reward
                  {pendingRewards.length > 1 ? "s" : ""} waiting — Redeem now!
                </button>
              )}

              {/* Recent check-ins */}
              {user.checkIns.length > 0 && (
                <div className="mt-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                  {user.checkIns
                    .slice()
                    .reverse()
                    .slice(0, 4)
                    .map((c: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between px-2 py-1 bg-secondary rounded text-[11px]"
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

          {/* What you can earn */}
          <div className="mk2-card">
            <div className="font-bold text-sm mb-3">What You Can Earn</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {[
                {
                  icon: "🏥",
                  label: "Free InBody Assessment",
                  desc: "Full body composition scan at reception — valued at R200",
                  milestone: "Every 40 check-ins",
                },
                {
                  icon: "👥",
                  label: "Bring-a-Buddy",
                  desc: "Bring a friend for a free gym session — valid any day",
                  milestone: "Every 40 check-ins",
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="rounded-xl p-4"
                  style={{
                    background: "hsl(20 100% 50% / 0.06)",
                    border: "1px solid hsl(20 100% 50% / 0.2)",
                  }}
                >
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <div className="font-bold text-sm text-foreground mb-1">
                    {r.label}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {r.desc}
                  </div>
                  <div
                    className="text-[10px] font-bold"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    🎯 {r.milestone}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              ⏱ Rewards expire {REWARD_EXPIRY_DAYS} days after being earned.
              Redeem at reception.
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* REWARDS HISTORY TAB                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div>
          {/* Pending rewards */}
          {pendingRewards.length > 0 && (
            <div className="mb-5">
              <div className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">🎁</span> Ready to Redeem (
                {pendingRewards.length})
              </div>
              <div className="flex flex-col gap-3">
                {pendingRewards.map(([id, r]) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil(
                      (r.expiresAt - Date.now()) / (1000 * 60 * 60 * 24),
                    ),
                  );
                  return (
                    <div
                      key={id}
                      className="mk2-card"
                      style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                        <div>
                          <div className="font-bold text-sm">
                            🎉 {r.checkInMilestone} Check-In Reward
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Earned{" "}
                            {new Date(r.earnedAt).toLocaleDateString("en-ZA")} ·{" "}
                            <span
                              style={{
                                color:
                                  daysLeft <= 7
                                    ? "hsl(0 84% 51%)"
                                    : "hsl(38 92% 44%)",
                              }}
                            >
                              Expires in {daysLeft} day
                              {daysLeft !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Choose reward type */}
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        Choose Your Reward
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {[
                          {
                            val: "inbody" as const,
                            icon: "🏥",
                            label: "Free InBody Assessment",
                          },
                          {
                            val: "buddy" as const,
                            icon: "👥",
                            label: "Bring-a-Buddy Session",
                          },
                        ].map((choice) => (
                          <button
                            key={choice.val}
                            onClick={() => setRewardChoice(choice.val)}
                            className="py-3 rounded-xl font-bold text-xs border-none cursor-pointer transition-all text-center"
                            style={{
                              background:
                                rewardChoice === choice.val
                                  ? "hsl(20 100% 50%)"
                                  : "hsl(var(--secondary))",
                              color:
                                rewardChoice === choice.val
                                  ? "#000"
                                  : "hsl(var(--foreground))",
                              border:
                                rewardChoice === choice.val
                                  ? "none"
                                  : "1px solid hsl(var(--border))",
                            }}
                          >
                            <div className="text-xl mb-1">{choice.icon}</div>
                            {choice.label}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => redeemReward(id)}
                        disabled={!rewardChoice || redeeming}
                        className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
                        style={{
                          background: rewardChoice
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--secondary))",
                          color: rewardChoice
                            ? "#000"
                            : "hsl(var(--muted-foreground))",
                          cursor: rewardChoice ? "pointer" : "not-allowed",
                        }}
                      >
                        {redeeming
                          ? "Redeeming…"
                          : rewardChoice
                            ? "Redeem & Get Code →"
                            : "Select a reward above"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Redeemed rewards */}
          {redeemedRewards.length > 0 && (
            <div className="mb-5">
              <div className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">✅</span> Redeemed (
                {redeemedRewards.length})
              </div>
              <div className="flex flex-col gap-2">
                {redeemedRewards.map(([id, r]) => (
                  <div
                    key={id}
                    className="mk2-card py-3"
                    style={{ borderLeft: "3px solid hsl(142 72% 37%)" }}
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {r.type === "inbody"
                            ? "🏥 InBody Assessment"
                            : "👥 Bring-a-Buddy"}
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: "hsl(142 72% 37% / 0.15)",
                              color: "hsl(142 72% 37%)",
                            }}
                          >
                            ✓ Redeemed
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.redeemedAt).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {r.redemptionCode}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expired rewards */}
          {Object.entries(rewards).filter(([, r]) => r.status === "expired")
            .length > 0 && (
            <div className="mb-5">
              <div className="font-bold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
                <span className="text-lg">⏱</span> Expired
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(rewards)
                  .filter(([, r]) => r.status === "expired")
                  .map(([id, r]) => (
                    <div
                      key={id}
                      className="mk2-card py-3 opacity-50"
                      style={{ borderLeft: "3px solid hsl(var(--border))" }}
                    >
                      <div className="font-bold text-sm">
                        {r.checkInMilestone} Check-In Reward — Expired
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Earned{" "}
                        {new Date(r.earnedAt).toLocaleDateString("en-ZA")} ·
                        Expired{" "}
                        {new Date(r.expiresAt).toLocaleDateString("en-ZA")}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {Object.keys(rewards).length === 0 && (
            <div className="mk2-card text-center py-12">
              <div className="text-4xl mb-3">🎯</div>
              <div className="font-bold text-sm mb-1">No rewards yet</div>
              <div className="text-xs text-muted-foreground mb-4">
                Check in {CHECKIN_MILESTONE - rewardStatus.progressToNext} more
                times to earn your first reward
              </div>
              <Btn variant="primary" onClick={() => setActiveTab("checkin")}>
                Go Check In →
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* ── Reward modal — shown right after milestone hit ──────────────── */}
      <AnimatePresence>
        {showRewardModal && pendingRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="text-5xl mb-3">🎉</div>
              <div
                className="font-display text-2xl mb-1"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                REWARD EARNED!
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                You've reached {user.checkIns.length} check-ins! Choose your
                reward and redeem at reception.
              </div>
              <button
                onClick={() => {
                  setShowRewardModal(false);
                  setActiveTab("history");
                }}
                className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
              >
                Choose My Reward →
              </button>
              <button
                onClick={() => setShowRewardModal(false)}
                className="mt-2 text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
              >
                Redeem later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent, db } from "@/lib/firebase";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { ref, push, set, onValue } from "firebase/database";
// import { getRewardStatus } from "./Dashboard";

// // ── Constants ─────────────────────────────────────────────────────────────────
// const CHECKIN_MILESTONE = 40;
// const REWARD_EXPIRY_DAYS = 7;

// // ── Unique code generator ─────────────────────────────────────────────────────
// function generateCode(): string {
//   return `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
// }

// // ── Simple QR-like code display (text based) ──────────────────────────────────
// function RedemptionCode({ code }: { code: string }) {
//   const [copied, setCopied] = useState(false);
//   return (
//     <div className="text-center">
//       <div
//         className="font-display text-2xl tracking-widest py-4 px-6 rounded-xl mb-2 select-all"
//         style={{
//           background: "hsl(20 100% 50% / 0.1)",
//           border: "2px solid hsl(20 100% 50% / 0.4)",
//           color: "hsl(20 100% 50%)",
//         }}
//       >
//         {code}
//       </div>
//       <button
//         onClick={() => {
//           navigator.clipboard.writeText(code);
//           setCopied(true);
//           setTimeout(() => setCopied(false), 2000);
//         }}
//         className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
//         style={{
//           background: "hsl(var(--secondary))",
//           color: "hsl(var(--foreground))",
//         }}
//       >
//         {copied ? "✓ Copied!" : "Copy Code"}
//       </button>
//       <div className="text-xs text-muted-foreground mt-2">
//         Show this code at reception to redeem your reward
//       </div>
//     </div>
//   );
// }

// export function CheckIn() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [loading, setLoading] = useState(false);
//   const [rewardChoice, setRewardChoice] = useState<"inbody" | "buddy" | null>(
//     null,
//   );
//   const [showRewardModal, setShowRewardModal] = useState(false);
//   const [redeeming, setRedeeming] = useState(false);
//   const [rewards, setRewards] = useState<Record<string, any>>({});
//   const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");

//   const {
//     nearGym,
//     distanceM,
//     loading: geoLoading,
//     error: geoError,
//     requestLocation,
//   } = useGeolocation();

//   useEffect(() => {
//     if (!user) return;
//     return onValue(ref(db, `mk2_users/${user.uid}/rewards`), (snap) => {
//       setRewards(snap.val() ?? {});
//     });
//   }, [user?.uid]);

//   if (!user) return null;

//   const today = new Date().toLocaleDateString("en-ZA");
//   const checkedToday = user.checkIns.some((c: any) => c.date === today);
//   const rewardStatus = getRewardStatus(user.checkIns, rewards);
//   const pendingRewards = Object.entries(rewards).filter(
//     ([, r]) => r.status === "pending" && Date.now() < r.expiresAt,
//   );
//   const expiredRewards = Object.entries(rewards).filter(
//     ([, r]) => r.status === "pending" && Date.now() >= r.expiresAt,
//   );
//   const redeemedRewards = Object.entries(rewards).filter(
//     ([, r]) => r.status === "redeemed",
//   );

//   // ── Check in ──────────────────────────────────────────────────────────────
//   const doCheckIn = async () => {
//     if (checkedToday) return toast("Already checked in today!", "error");
//     if (!nearGym)
//       return toast(
//         "You must be at MK2R Ruimsig to check in (within 20m)",
//         "error",
//       );

//     setLoading(true);
//     const newCheckIns = [
//       ...user.checkIns,
//       {
//         date: today,
//         time: new Date().toLocaleTimeString("en-ZA", {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//       },
//     ];

//     const newTotal = newCheckIns.length;
//     const newMilestones = Math.floor(newTotal / CHECKIN_MILESTONE);
//     const oldMilestones = Math.floor(user.checkIns.length / CHECKIN_MILESTONE);

//     const updated = {
//       ...user,
//       points: user.points + 10,
//       checkIns: newCheckIns,
//     };
//     await updateUser(updated);
//     logEvent("gym_checkin", { points: updated.points });

//     // If new milestone reached, create a reward
//     if (newMilestones > oldMilestones) {
//       const code = generateCode();
//       const earnedAt = Date.now();
//       const expiresAt = earnedAt + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
//       await push(ref(db, `mk2_users/${user.uid}/rewards`), {
//         status: "pending",
//         earnedAt,
//         expiresAt,
//         redemptionCode: code,
//         checkInMilestone: newMilestones * CHECKIN_MILESTONE,
//         type: null, // chosen at redemption
//       });
//       toast(
//         `🎉 ${newTotal} check-ins! You've earned a reward — choose below!`,
//         "success",
//       );
//       setShowRewardModal(true);
//     } else {
//       toast(
//         `Checked in! +10 points 💪 (${newTotal % CHECKIN_MILESTONE}/${CHECKIN_MILESTONE} to next reward)`,
//         "success",
//       );
//     }

//     setLoading(false);
//   };

//   // ── Redeem reward ─────────────────────────────────────────────────────────
//   const redeemReward = async (rewardId: string) => {
//     if (!rewardChoice) return toast("Choose your reward first", "error");
//     setRedeeming(true);
//     try {
//       await set(ref(db, `mk2_users/${user.uid}/rewards/${rewardId}`), {
//         ...rewards[rewardId],
//         status: "redeemed",
//         type: rewardChoice,
//         redeemedAt: Date.now(),
//       });
//       toast(`🎁 Reward redeemed! Show your code at reception.`, "success");
//       setShowRewardModal(false);
//       setRewardChoice(null);
//     } catch {
//       toast("Redemption failed — try again", "error");
//     }
//     setRedeeming(false);
//   };

//   // ── Mark expired rewards ──────────────────────────────────────────────────
//   useEffect(() => {
//     expiredRewards.forEach(async ([id, r]) => {
//       await set(ref(db, `mk2_users/${user.uid}/rewards/${id}`), {
//         ...r,
//         status: "expired",
//       });
//     });
//   }, [expiredRewards.length]);

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Check in at the gym · Earn rewards every 40 visits">
//         Gym <span className="text-primary">Check-In</span>
//       </PageTitle>

//       {/* ── Tab switcher ─────────────────────────────────────────────────── */}
//       <div
//         className="flex gap-1.5 p-1 rounded-xl w-fit mb-5"
//         style={{ background: "hsl(var(--secondary))" }}
//       >
//         {[
//           { id: "checkin", label: "✅ Check In" },
//           {
//             id: "history",
//             label: `🎁 Rewards${pendingRewards.length > 0 ? ` (${pendingRewards.length})` : ""}`,
//           },
//         ].map((t) => (
//           <button
//             key={t.id}
//             onClick={() => setActiveTab(t.id as any)}
//             className="px-4 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer font-body"
//             style={{
//               background:
//                 activeTab === t.id ? "hsl(20 100% 50%)" : "transparent",
//               color:
//                 activeTab === t.id ? "#000" : "hsl(var(--muted-foreground))",
//             }}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* ══════════════════════════════════════════════════════════════════ */}
//       {/* CHECK IN TAB                                                       */}
//       {/* ══════════════════════════════════════════════════════════════════ */}
//       {activeTab === "checkin" && (
//         <>
//           {/* Location status */}
//           <div
//             className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
//             style={{
//               background: nearGym
//                 ? "hsl(142 72% 37% / 0.08)"
//                 : "hsl(20 100% 50% / 0.08)",
//               border: `1px solid ${nearGym ? "hsl(142 72% 37% / 0.25)" : "hsl(20 100% 50% / 0.2)"}`,
//             }}
//           >
//             <span
//               className="material-symbols-rounded text-xl"
//               style={{
//                 color: nearGym ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
//               }}
//             >
//               {nearGym ? "location_on" : "location_off"}
//             </span>
//             <div className="flex-1 text-xs">
//               {geoLoading ? (
//                 <span className="text-muted-foreground">
//                   Detecting location…
//                 </span>
//               ) : geoError ? (
//                 <span style={{ color: "hsl(20 100% 50%)" }}>
//                   Location error — {geoError}
//                 </span>
//               ) : nearGym ? (
//                 <span style={{ color: "hsl(142 72% 37%)" }}>
//                   ✓ You're at MK2R Ruimsig — ready!
//                 </span>
//               ) : distanceM !== null ? (
//                 <span style={{ color: "hsl(20 100% 50%)" }}>
//                   {distanceM}m from gym — must be within 20m
//                 </span>
//               ) : (
//                 <span className="text-muted-foreground">
//                   Tap Enable to detect location
//                 </span>
//               )}
//             </div>
//             {!geoLoading && (
//               <button
//                 onClick={requestLocation}
//                 className="text-[11px] font-bold border-none bg-transparent cursor-pointer"
//                 style={{ color: "hsl(20 100% 50%)" }}
//               >
//                 {distanceM !== null ? "Refresh" : "Enable"}
//               </button>
//             )}
//           </div>

//           <div
//             className={`grid gap-4 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
//           >
//             {/* Check-in button card */}
//             <motion.div
//               initial={{ opacity: 0, scale: 0.97 }}
//               animate={{ opacity: 1, scale: 1 }}
//               className="mk2-card text-center"
//               style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
//             >
//               <div
//                 className="font-display leading-none mb-1.5"
//                 style={{
//                   fontSize: 72,
//                   color: checkedToday ? "hsl(142 72% 37%)" : "hsl(20 100% 50%)",
//                 }}
//               >
//                 {checkedToday ? "✓" : user.checkIns.length}
//               </div>
//               <div className="font-bold text-sm mb-1">
//                 {checkedToday ? "Checked in today!" : "Total check-ins"}
//               </div>
//               <div className="text-muted-foreground text-xs mb-4">
//                 {checkedToday
//                   ? "Come back tomorrow for more points"
//                   : "Must be at MK2R Ruimsig"}
//               </div>
//               <Btn
//                 variant={checkedToday || !nearGym ? "subtle" : "primary"}
//                 size="lg"
//                 onClick={doCheckIn}
//                 disabled={checkedToday || loading || !nearGym}
//                 full
//               >
//                 {loading
//                   ? "Checking in…"
//                   : checkedToday
//                     ? "✓ Checked In Today"
//                     : !nearGym
//                       ? "📍 Not at gym yet"
//                       : "⚡ Check In Now (+10 pts)"}
//               </Btn>
//             </motion.div>

//             {/* Reward progress card */}
//             <div
//               className="mk2-card"
//               style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
//             >
//               <div className="font-bold text-sm mb-1">Loyalty Program</div>
//               <div className="text-xs text-muted-foreground mb-3">
//                 Every {CHECKIN_MILESTONE} check-ins earns a reward
//               </div>

//               {/* Progress bar */}
//               <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
//                 <motion.div
//                   className="h-full rounded-full"
//                   initial={{ width: 0 }}
//                   animate={{ width: `${rewardStatus.pct}%` }}
//                   transition={{ duration: 0.8 }}
//                   style={{ background: "hsl(20 100% 50%)" }}
//                 />
//               </div>
//               <div className="flex justify-between text-xs text-muted-foreground mb-4">
//                 <span>
//                   {rewardStatus.progressToNext} / {CHECKIN_MILESTONE}
//                 </span>
//                 <span>
//                   {CHECKIN_MILESTONE - rewardStatus.progressToNext} to go
//                 </span>
//               </div>

//               {/* Stats */}
//               <div className="grid grid-cols-3 gap-2 mb-4">
//                 {[
//                   { label: "Total", value: rewardStatus.total },
//                   { label: "Earned", value: rewardStatus.milestonesEarned },
//                   { label: "Redeemed", value: rewardStatus.rewardsRedeemed },
//                 ].map((s) => (
//                   <div
//                     key={s.label}
//                     className="bg-secondary rounded-lg p-2 text-center"
//                   >
//                     <div className="font-display text-xl text-primary">
//                       {s.value}
//                     </div>
//                     <div className="text-[10px] text-muted-foreground">
//                       {s.label}
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Pending reward alert */}
//               {pendingRewards.length > 0 && (
//                 <button
//                   onClick={() => setActiveTab("history")}
//                   className="w-full py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer animate-pulse"
//                   style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//                 >
//                   🎁 {pendingRewards.length} reward
//                   {pendingRewards.length > 1 ? "s" : ""} waiting — Redeem now!
//                 </button>
//               )}

//               {/* Recent check-ins */}
//               {user.checkIns.length > 0 && (
//                 <div className="mt-3 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
//                   {user.checkIns
//                     .slice()
//                     .reverse()
//                     .slice(0, 4)
//                     .map((c: any, i: number) => (
//                       <div
//                         key={i}
//                         className="flex justify-between px-2 py-1 bg-secondary rounded text-[11px]"
//                       >
//                         <span className="text-primary font-bold">+10 pts</span>
//                         <span className="text-muted-foreground">
//                           {c.date} · {c.time}
//                         </span>
//                       </div>
//                     ))}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* What you can earn */}
//           <div className="mk2-card">
//             <div className="font-bold text-sm mb-3">What You Can Earn</div>
//             <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
//               {[
//                 {
//                   icon: "🏥",
//                   label: "Free InBody Assessment",
//                   desc: "Full body composition scan at reception — valued at R200",
//                   milestone: "Every 40 check-ins",
//                 },
//                 {
//                   icon: "👥",
//                   label: "Bring-a-Buddy",
//                   desc: "Bring a friend for a free gym session — valid any day",
//                   milestone: "Every 40 check-ins",
//                 },
//               ].map((r) => (
//                 <div
//                   key={r.label}
//                   className="rounded-xl p-4"
//                   style={{
//                     background: "hsl(20 100% 50% / 0.06)",
//                     border: "1px solid hsl(20 100% 50% / 0.2)",
//                   }}
//                 >
//                   <div className="text-2xl mb-2">{r.icon}</div>
//                   <div className="font-bold text-sm text-foreground mb-1">
//                     {r.label}
//                   </div>
//                   <div className="text-xs text-muted-foreground mb-2">
//                     {r.desc}
//                   </div>
//                   <div
//                     className="text-[10px] font-bold"
//                     style={{ color: "hsl(20 100% 50%)" }}
//                   >
//                     🎯 {r.milestone}
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-3 text-xs text-muted-foreground">
//               ⏱ Rewards expire {REWARD_EXPIRY_DAYS} days after being earned.
//               Redeem at reception.
//             </div>
//           </div>
//         </>
//       )}

//       {/* ══════════════════════════════════════════════════════════════════ */}
//       {/* REWARDS HISTORY TAB                                               */}
//       {/* ══════════════════════════════════════════════════════════════════ */}
//       {activeTab === "history" && (
//         <div>
//           {/* Pending rewards */}
//           {pendingRewards.length > 0 && (
//             <div className="mb-5">
//               <div className="font-bold text-sm mb-3 flex items-center gap-2">
//                 <span className="text-lg">🎁</span> Ready to Redeem (
//                 {pendingRewards.length})
//               </div>
//               <div className="flex flex-col gap-3">
//                 {pendingRewards.map(([id, r]) => {
//                   const daysLeft = Math.max(
//                     0,
//                     Math.ceil(
//                       (r.expiresAt - Date.now()) / (1000 * 60 * 60 * 24),
//                     ),
//                   );
//                   return (
//                     <div
//                       key={id}
//                       className="mk2-card"
//                       style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//                     >
//                       <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
//                         <div>
//                           <div className="font-bold text-sm">
//                             🎉 {r.checkInMilestone} Check-In Reward
//                           </div>
//                           <div className="text-xs text-muted-foreground mt-0.5">
//                             Earned{" "}
//                             {new Date(r.earnedAt).toLocaleDateString("en-ZA")} ·{" "}
//                             <span
//                               style={{
//                                 color:
//                                   daysLeft <= 2
//                                     ? "hsl(0 84% 51%)"
//                                     : "hsl(38 92% 44%)",
//                               }}
//                             >
//                               Expires in {daysLeft} day
//                               {daysLeft !== 1 ? "s" : ""}
//                             </span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Choose reward type */}
//                       <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
//                         Choose Your Reward
//                       </div>
//                       <div className="grid grid-cols-2 gap-2 mb-3">
//                         {[
//                           {
//                             val: "inbody" as const,
//                             icon: "🏥",
//                             label: "Free InBody Assessment",
//                           },
//                           {
//                             val: "buddy" as const,
//                             icon: "👥",
//                             label: "Bring-a-Buddy Session",
//                           },
//                         ].map((choice) => (
//                           <button
//                             key={choice.val}
//                             onClick={() => setRewardChoice(choice.val)}
//                             className="py-3 rounded-xl font-bold text-xs border-none cursor-pointer transition-all text-center"
//                             style={{
//                               background:
//                                 rewardChoice === choice.val
//                                   ? "hsl(20 100% 50%)"
//                                   : "hsl(var(--secondary))",
//                               color:
//                                 rewardChoice === choice.val
//                                   ? "#000"
//                                   : "hsl(var(--foreground))",
//                               border:
//                                 rewardChoice === choice.val
//                                   ? "none"
//                                   : "1px solid hsl(var(--border))",
//                             }}
//                           >
//                             <div className="text-xl mb-1">{choice.icon}</div>
//                             {choice.label}
//                           </button>
//                         ))}
//                       </div>

//                       <button
//                         onClick={() => redeemReward(id)}
//                         disabled={!rewardChoice || redeeming}
//                         className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
//                         style={{
//                           background: rewardChoice
//                             ? "hsl(20 100% 50%)"
//                             : "hsl(var(--secondary))",
//                           color: rewardChoice
//                             ? "#000"
//                             : "hsl(var(--muted-foreground))",
//                           cursor: rewardChoice ? "pointer" : "not-allowed",
//                         }}
//                       >
//                         {redeeming
//                           ? "Redeeming…"
//                           : rewardChoice
//                             ? "Redeem & Get Code →"
//                             : "Select a reward above"}
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* Redeemed rewards */}
//           {redeemedRewards.length > 0 && (
//             <div className="mb-5">
//               <div className="font-bold text-sm mb-3 flex items-center gap-2">
//                 <span className="text-lg">✅</span> Redeemed (
//                 {redeemedRewards.length})
//               </div>
//               <div className="flex flex-col gap-2">
//                 {redeemedRewards.map(([id, r]) => (
//                   <div
//                     key={id}
//                     className="mk2-card py-3"
//                     style={{ borderLeft: "3px solid hsl(142 72% 37%)" }}
//                   >
//                     <div className="flex justify-between items-center flex-wrap gap-2">
//                       <div>
//                         <div className="font-bold text-sm flex items-center gap-2">
//                           {r.type === "inbody"
//                             ? "🏥 InBody Assessment"
//                             : "👥 Bring-a-Buddy"}
//                           <span
//                             className="text-[10px] font-bold px-2 py-0.5 rounded-full"
//                             style={{
//                               background: "hsl(142 72% 37% / 0.15)",
//                               color: "hsl(142 72% 37%)",
//                             }}
//                           >
//                             ✓ Redeemed
//                           </span>
//                         </div>
//                         <div className="text-xs text-muted-foreground mt-0.5">
//                           {new Date(r.redeemedAt).toLocaleDateString("en-ZA", {
//                             day: "numeric",
//                             month: "long",
//                             year: "numeric",
//                           })}
//                         </div>
//                       </div>
//                       <div className="text-xs font-mono text-muted-foreground">
//                         {r.redemptionCode}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Expired rewards */}
//           {Object.entries(rewards).filter(([, r]) => r.status === "expired")
//             .length > 0 && (
//             <div className="mb-5">
//               <div className="font-bold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
//                 <span className="text-lg">⏱</span> Expired
//               </div>
//               <div className="flex flex-col gap-2">
//                 {Object.entries(rewards)
//                   .filter(([, r]) => r.status === "expired")
//                   .map(([id, r]) => (
//                     <div
//                       key={id}
//                       className="mk2-card py-3 opacity-50"
//                       style={{ borderLeft: "3px solid hsl(var(--border))" }}
//                     >
//                       <div className="font-bold text-sm">
//                         {r.checkInMilestone} Check-In Reward — Expired
//                       </div>
//                       <div className="text-xs text-muted-foreground">
//                         Earned{" "}
//                         {new Date(r.earnedAt).toLocaleDateString("en-ZA")} ·
//                         Expired{" "}
//                         {new Date(r.expiresAt).toLocaleDateString("en-ZA")}
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>
//           )}

//           {/* Empty state */}
//           {Object.keys(rewards).length === 0 && (
//             <div className="mk2-card text-center py-12">
//               <div className="text-4xl mb-3">🎯</div>
//               <div className="font-bold text-sm mb-1">No rewards yet</div>
//               <div className="text-xs text-muted-foreground mb-4">
//                 Check in {CHECKIN_MILESTONE - rewardStatus.progressToNext} more
//                 times to earn your first reward
//               </div>
//               <Btn variant="primary" onClick={() => setActiveTab("checkin")}>
//                 Go Check In →
//               </Btn>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── Reward modal — shown right after milestone hit ──────────────── */}
//       <AnimatePresence>
//         {showRewardModal && pendingRewards.length > 0 && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 flex items-center justify-center z-50 p-4"
//             style={{ background: "rgba(0,0,0,0.7)" }}
//           >
//             <motion.div
//               initial={{ scale: 0.9, y: 20 }}
//               animate={{ scale: 1, y: 0 }}
//               exit={{ scale: 0.9, y: 20 }}
//               className="w-full max-w-sm rounded-2xl p-6 text-center"
//               style={{
//                 background: "hsl(var(--card))",
//                 border: "1px solid hsl(var(--border))",
//               }}
//             >
//               <div className="text-5xl mb-3">🎉</div>
//               <div
//                 className="font-display text-2xl mb-1"
//                 style={{ color: "hsl(20 100% 50%)" }}
//               >
//                 REWARD EARNED!
//               </div>
//               <div className="text-sm text-muted-foreground mb-4">
//                 You've reached {user.checkIns.length} check-ins! Choose your
//                 reward and redeem at reception.
//               </div>
//               <button
//                 onClick={() => {
//                   setShowRewardModal(false);
//                   setActiveTab("history");
//                 }}
//                 className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer"
//                 style={{ background: "hsl(20 100% 50%)", color: "#000" }}
//               >
//                 Choose My Reward →
//               </button>
//               <button
//                 onClick={() => setShowRewardModal(false)}
//                 className="mt-2 text-xs text-muted-foreground bg-transparent border-none cursor-pointer"
//               >
//                 Redeem later
//               </button>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
