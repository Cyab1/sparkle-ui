import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent, db } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/useGeolocation";
import { ref, push, set, onValue } from "firebase/database";
import { getRewardStatus } from "./Dashboard";
import { QRScanner } from "@/components/shared/QRScanner";

// ── Constants ─────────────────────────────────────────────────────────────────
const CHECKIN_MILESTONE = 40;
const REWARD_EXPIRY_DAYS = 60;
const GYM_CHECKIN_QR_CODE = "MK2R-GYM-ENTRY";

function generateCode(): string {
  return `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// ── Redemption code display ───────────────────────────────────────────────────
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

// ── Animated check-in ring ────────────────────────────────────────────────────
function CheckInRing({
  current,
  milestone,
  checkedToday,
}: {
  current: number;
  milestone: number;
  checkedToday: boolean;
}) {
  const progress = current % milestone;
  const pct = progress / milestone;
  const SIZE = 220;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  // Animate from 0 → target on mount
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const dashOffset = CIRCUMFERENCE * (1 - animPct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={STROKE}
          />
          {/* Filled arc */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="hsl(20 100% 50%)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          />
        </svg>

        {/* Centre content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {checkedToday ? (
            <>
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                  delay: 0.6,
                }}
                style={{ fontSize: 48 }}
              >
                ✓
              </motion.span>
              <span
                className="font-display text-xs uppercase tracking-widest"
                style={{ color: "hsl(142 72% 37%)" }}
              >
                Done today
              </span>
            </>
          ) : (
            <>
              <motion.span
                className="font-display font-bold leading-none"
                style={{ fontSize: 52, color: "hsl(20 100% 50%)" }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {current}
              </motion.span>
              <span className="text-xs text-muted-foreground font-medium">
                check-ins
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: "hsl(20 100% 50% / 0.7)" }}
              >
                {progress}/{milestone} to reward
              </span>
            </>
          )}
        </div>
      </div>

      {/* Milestone markers */}
      <div className="flex items-center gap-2 mt-3">
        {[...Array(3)].map((_, i) => {
          const earned = Math.floor(current / milestone) > i;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.5 + i * 0.1,
                type: "spring",
                stiffness: 300,
              }}
              className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{
                width: 28,
                height: 28,
                background: earned
                  ? "hsl(20 100% 50%)"
                  : "hsl(var(--secondary))",
                color: earned ? "#000" : "hsl(var(--muted-foreground))",
                border: earned ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              {earned ? "✓" : `${(i + 1) * milestone}`}
            </motion.div>
          );
        })}
        <span className="text-[10px] text-muted-foreground ml-1">
          milestones
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CheckIn() {
  const { user, setUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [rewardChoice, setRewardChoice] = useState<
    Record<string, "inbody" | "buddy">
  >({});
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [rewards, setRewards] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrScanning, setQrScanning] = useState(false);
  const qrScanningRef = useRef(false);

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

  // ── Core check-in logic ───────────────────────────────────────────────────
  const doCheckIn = async (calledFromQR = false) => {
    if (!calledFromQR) {
      if (checkedToday) {
        toast("Already checked in today!", "error");
        return;
      }
      if (geoLoading) {
        toast("Still detecting location — try again in a moment", "error");
        return;
      }
      if (!nearGym) {
        toast(
          distanceM !== null
            ? `You're ${distanceM}m away — must be within 20m of MK2R Ruimsig`
            : "Enable location to check in at MK2R Ruimsig",
          "error",
        );
        return;
      }
    }

    setLoading(true);
    try {
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
      const oldMilestones = Math.floor(
        user.checkIns.length / CHECKIN_MILESTONE,
      );

      await Promise.race([
        Promise.all([
          set(ref(db, `mk2_users/${user.uid}/checkIns`), newCheckIns),
          set(ref(db, `mk2_users/${user.uid}/points`), user.points + 10),
        ]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Check-in timed out — please try again")),
            8_000,
          ),
        ),
      ]);

      setUser({ ...user, points: user.points + 10, checkIns: newCheckIns });
      logEvent("gym_checkin", { points: user.points + 10 });

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
          type: null,
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
    } catch (err: any) {
      console.error("doCheckIn error:", err);
      toast(err?.message ?? "Check-in failed — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── QR handler ────────────────────────────────────────────────────────────
  const handleQRScan = async (data: string) => {
    if (qrScanningRef.current) return;
    qrScanningRef.current = true;
    setQrScanning(true);
    setShowQRScanner(false);
    setQrError(null);

    try {
      if (data.trim() !== GYM_CHECKIN_QR_CODE) {
        setQrError(
          `Invalid QR code. Expected the gym check-in code at reception. (Got: "${data.trim()}")`,
        );
        return;
      }
      if (checkedToday) {
        toast("Already checked in today!", "error");
        return;
      }
      if (geoLoading) {
        toast("Detecting your location… please wait", "info");
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!nearGym) {
        toast(
          distanceM !== null
            ? `You're ${distanceM}m away — must be within 20m of MK2R Ruimsig`
            : "Enable location to check in at MK2R Ruimsig",
          "error",
        );
        return;
      }
      await doCheckIn(true);
    } finally {
      qrScanningRef.current = false;
      setQrScanning(false);
    }
  };

  // ── Redeem ────────────────────────────────────────────────────────────────
  const redeemReward = async (rewardId: string) => {
    const choice = rewardChoice[rewardId];
    if (!choice) return toast("Choose your reward first", "error");
    setRedeeming(true);
    try {
      await set(ref(db, `mk2_users/${user.uid}/rewards/${rewardId}`), {
        ...rewards[rewardId],
        status: "redeemed",
        type: choice,
        redeemedAt: Date.now(),
      });
      toast("🎁 Reward redeemed! Show your code at reception.", "success");
      setShowRewardModal(false);
      setRewardChoice((prev) => {
        const n = { ...prev };
        delete n[rewardId];
        return n;
      });
    } catch {
      toast("Redemption failed — try again", "error");
    }
    setRedeeming(false);
  };

  // ── Expire stale rewards ──────────────────────────────────────────────────
  useEffect(() => {
    if (!expiredRewards.length) return;
    expiredRewards.forEach(async ([id, r]) => {
      await set(ref(db, `mk2_users/${user.uid}/rewards/${id}`), {
        ...r,
        status: "expired",
      });
    });
  }, [expiredRewards.map(([id]) => id).join(",")]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`max-w-[640px] mx-auto ${isMobile ? "px-4 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Check in at the gym · Earn rewards every 40 visits">
        Gym <span className="text-primary">Check-In</span>
      </PageTitle>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div
        className="flex gap-1.5 p-1 rounded-xl w-fit mb-6"
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
        <div className="flex flex-col gap-4">
          {/* ── Hero ring ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-6 flex flex-col items-center gap-5"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <CheckInRing
              current={user.checkIns.length}
              milestone={CHECKIN_MILESTONE}
              checkedToday={checkedToday}
            />

            {/* CTA button */}
            <div className="w-full flex flex-col gap-2">
              {!checkedToday && (
                <button
                  onClick={() => {
                    setShowQRScanner((v) => !v);
                    setQrError(null);
                  }}
                  disabled={!nearGym && !geoLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
                  style={{
                    background: nearGym
                      ? "hsl(20 100% 50% / 0.10)"
                      : "hsl(var(--secondary))",
                    color: nearGym
                      ? "hsl(20 100% 50%)"
                      : "hsl(var(--muted-foreground))",
                    border: `1px solid ${nearGym ? "hsl(20 100% 50% / 0.30)" : "hsl(var(--border))"}`,
                    cursor: nearGym ? "pointer" : "not-allowed",
                    opacity: geoLoading ? 0.6 : 1,
                  }}
                >
                  {qrScanning
                    ? "Processing…"
                    : showQRScanner
                      ? "✕ Close Scanner"
                      : "📷 Scan QR Code"}
                </button>
              )}

              <Btn
                variant={checkedToday || !nearGym ? "subtle" : "primary"}
                size="lg"
                onClick={doCheckIn}
                disabled={checkedToday || loading || (!nearGym && !geoLoading)}
                full
              >
                {loading
                  ? "Checking in…"
                  : checkedToday
                    ? "✓ Checked In Today"
                    : geoLoading
                      ? "📍 Detecting location…"
                      : !nearGym
                        ? "📍 Not at gym yet"
                        : "⚡ Check In Now (+10 pts)"}
              </Btn>
            </div>
          </motion.div>

          {/* ── Location pill ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
            style={{
              background: nearGym
                ? "hsl(142 72% 37% / 0.08)"
                : "hsl(20 100% 50% / 0.06)",
              border: `1px solid ${
                nearGym ? "hsl(142 72% 37% / 0.25)" : "hsl(20 100% 50% / 0.18)"
              }`,
            }}
          >
            <span
              className="material-symbols-rounded text-xl shrink-0"
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
                  ✓ You're at MK2R Ruimsig — ready to check in!
                </span>
              ) : distanceM !== null ? (
                <span style={{ color: "hsl(20 100% 50%)" }}>
                  {distanceM}m from gym — must be within 20m
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Tap Enable to detect your location
                </span>
              )}
            </div>
            {!geoLoading && (
              <button
                onClick={requestLocation}
                className="text-[11px] font-bold border-none bg-transparent cursor-pointer shrink-0"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                {distanceM !== null ? "Refresh" : "Enable"}
              </button>
            )}
          </motion.div>

          {/* ── QR scanner panel ──────────────────────────────────────── */}
          <AnimatePresence>
            {showQRScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid hsl(20 100% 50% / 0.3)" }}
              >
                <div
                  className="px-4 py-2.5 flex justify-between items-center"
                  style={{ background: "hsl(20 100% 50% / 0.08)" }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    Scan the gym QR code at reception
                  </span>
                  <button
                    onClick={() => {
                      setShowQRScanner(false);
                      setQrError(null);
                    }}
                    className="text-xs border-none bg-transparent cursor-pointer text-muted-foreground"
                  >
                    ✕ Cancel
                  </button>
                </div>
                <div style={{ minHeight: 280 }}>
                  <QRScanner onScan={handleQRScan} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── QR error ──────────────────────────────────────────────── */}
          {qrError && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{
                background: "hsl(0 84% 51% / 0.08)",
                border: "1px solid hsl(0 84% 51% / 0.2)",
                color: "hsl(0 84% 51%)",
              }}
            >
              ⚠ {qrError}
              {import.meta.env.DEV && (
                <div className="mt-1 font-mono opacity-60">
                  Expected: "{GYM_CHECKIN_QR_CODE}"
                </div>
              )}
            </div>
          )}

          {/* ── Progress card (compact) ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="rounded-2xl p-4"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="font-bold text-sm mb-1">Loyalty Progress</div>
            <div className="text-xs text-muted-foreground mb-3">
              Every {CHECKIN_MILESTONE} check-ins earns a reward
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${rewardStatus.pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
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

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: rewardStatus.total },
                { label: "Earned", value: rewardStatus.milestonesEarned },
                { label: "Redeemed", value: rewardStatus.rewardsRedeemed },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  <div
                    className="font-display text-xl"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Pending reward CTA */}
            {pendingRewards.length > 0 && (
              <button
                onClick={() => setActiveTab("history")}
                className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer animate-pulse"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
              >
                🎁 {pendingRewards.length} reward
                {pendingRewards.length > 1 ? "s" : ""} waiting — Redeem now!
              </button>
            )}

            {/* Recent check-ins */}
            {user.checkIns.length > 0 && (
              <div className="mt-3 flex flex-col gap-1 max-h-[96px] overflow-y-auto">
                {user.checkIns
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between px-2 py-1 rounded text-[11px]"
                      style={{ background: "hsl(var(--secondary))" }}
                    >
                      <span
                        style={{ color: "hsl(20 100% 50%)" }}
                        className="font-bold"
                      >
                        +10 pts
                      </span>
                      <span className="text-muted-foreground">
                        {c.date} · {c.time}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>

          {/* ── What you can earn ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="rounded-2xl p-4"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="font-bold text-sm mb-3">What You Can Earn</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "🏥",
                  label: "Free InBody Assessment",
                  desc: "Full body composition scan — valued at R200",
                  milestone: "Every 40 check-ins",
                },
                {
                  icon: "👥",
                  label: "Bring-a-Buddy",
                  desc: "Bring a friend for a free gym session",
                  milestone: "Every 40 check-ins",
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="rounded-xl p-3.5"
                  style={{
                    background: "hsl(20 100% 50% / 0.05)",
                    border: "1px solid hsl(20 100% 50% / 0.18)",
                  }}
                >
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <div className="font-bold text-xs text-foreground mb-1">
                    {r.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2">
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
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* REWARDS HISTORY TAB                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          {/* Pending */}
          {pendingRewards.length > 0 && (
            <div>
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
                      className="rounded-2xl p-4"
                      style={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderLeft: "3px solid hsl(20 100% 50%)",
                      }}
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

                      {r.type && (
                        <div className="mb-3">
                          <RedemptionCode code={r.redemptionCode} />
                        </div>
                      )}

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
                            onClick={() =>
                              setRewardChoice((prev) => ({
                                ...prev,
                                [id]: choice.val,
                              }))
                            }
                            className="py-3 rounded-xl font-bold text-xs border-none cursor-pointer transition-all text-center"
                            style={{
                              background:
                                rewardChoice[id] === choice.val
                                  ? "hsl(20 100% 50%)"
                                  : "hsl(var(--secondary))",
                              color:
                                rewardChoice[id] === choice.val
                                  ? "#000"
                                  : "hsl(var(--foreground))",
                              border:
                                rewardChoice[id] === choice.val
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
                        disabled={!rewardChoice[id] || redeeming}
                        className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
                        style={{
                          background: rewardChoice[id]
                            ? "hsl(20 100% 50%)"
                            : "hsl(var(--secondary))",
                          color: rewardChoice[id]
                            ? "#000"
                            : "hsl(var(--muted-foreground))",
                          cursor: rewardChoice[id] ? "pointer" : "not-allowed",
                        }}
                      >
                        {redeeming
                          ? "Redeeming…"
                          : rewardChoice[id]
                            ? "Redeem & Get Code →"
                            : "Select a reward above"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Redeemed */}
          {redeemedRewards.length > 0 && (
            <div>
              <div className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">✅</span> Redeemed (
                {redeemedRewards.length})
              </div>
              <div className="flex flex-col gap-2">
                {redeemedRewards.map(([id, r]) => (
                  <div
                    key={id}
                    className="rounded-2xl px-4 py-3"
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderLeft: "3px solid hsl(142 72% 37%)",
                    }}
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

          {/* Expired */}
          {Object.entries(rewards).filter(([, r]) => r.status === "expired")
            .length > 0 && (
            <div>
              <div className="font-bold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
                <span className="text-lg">⏱</span> Expired
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(rewards)
                  .filter(([, r]) => r.status === "expired")
                  .map(([id, r]) => (
                    <div
                      key={id}
                      className="rounded-2xl px-4 py-3 opacity-50"
                      style={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderLeft: "3px solid hsl(var(--border))",
                      }}
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
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
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

      {/* ── Reward modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRewardModal && pendingRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 16,
                  delay: 0.1,
                }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <div
                className="font-display text-2xl mb-1"
                style={{ color: "hsl(20 100% 50%)" }}
              >
                REWARD EARNED!
              </div>
              <div className="text-sm text-muted-foreground mb-5">
                You've reached {user.checkIns.length} check-ins! Choose your
                reward and redeem at reception.
              </div>
              <button
                onClick={() => {
                  setShowRewardModal(false);
                  setActiveTab("history");
                }}
                className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition hover:brightness-105"
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

// import { useState, useEffect, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent, db } from "@/lib/firebase";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";
// import { useGeolocation } from "@/hooks/useGeolocation";
// import { ref, push, set, onValue } from "firebase/database";
// import { getRewardStatus } from "./Dashboard";
// import { QRScanner } from "@/components/shared/QRScanner";

// // ── Constants ─────────────────────────────────────────────────────────────────
// const CHECKIN_MILESTONE = 40;
// const REWARD_EXPIRY_DAYS = 60;

// // ✅ This must exactly match what your QR code encodes.
// // Scan the QR with Google Lens / phone camera to confirm the raw text,
// // then update this value if it differs.
// const GYM_CHECKIN_QR_CODE = "MK2R-GYM-ENTRY";

// // ── Unique code generator ─────────────────────────────────────────────────────
// function generateCode(): string {
//   return `MK2R-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
// }

// // ── Redemption code display ───────────────────────────────────────────────────
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
//   const { user, setUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();

//   const [loading, setLoading] = useState(false);
//   const [rewardChoice, setRewardChoice] = useState<
//     Record<string, "inbody" | "buddy">
//   >({});
//   const [showRewardModal, setShowRewardModal] = useState(false);
//   const [redeeming, setRedeeming] = useState(false);
//   const [rewards, setRewards] = useState<Record<string, any>>({});
//   const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");
//   const [showQRScanner, setShowQRScanner] = useState(false);
//   const [qrError, setQrError] = useState<string | null>(null);
//   const [qrScanning, setQrScanning] = useState(false);
//   // u2705 Ref-based lock: guards against duplicate scans BEFORE React state flushes.
//   // useState alone fails because QRScanner fires onScan multiple times synchronously;
//   // the second call sees stale state (false) and bypasses the guard. A ref updates
//   // synchronously so the lock holds immediately.
//   const qrScanningRef = useRef(false);

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

//   // ── Core check-in logic ───────────────────────────────────────────────────
//   const doCheckIn = async (calledFromQR = false) => {
//     // Guards — only run on manual button press, QR path pre-checks these
//     if (!calledFromQR) {
//       if (checkedToday) {
//         toast("Already checked in today!", "error");
//         return;
//       }
//       if (geoLoading) {
//         toast("Still detecting location — try again in a moment", "error");
//         return;
//       }
//       if (!nearGym) {
//         toast(
//           distanceM !== null
//             ? `You're ${distanceM}m away — must be within 20m of MK2R Ruimsig`
//             : "Enable location to check in at MK2R Ruimsig",
//           "error",
//         );
//         return;
//       }
//     }

//     // ✅ Always set loading true — both manual AND QR paths need the button locked.
//     //    Previously calledFromQR skipped setLoading, so the QR button never showed
//     //    "Processing…" and could be tapped again mid-flight.
//     setLoading(true);

//     try {
//       const newCheckIns = [
//         ...user.checkIns,
//         {
//           date: today,
//           time: new Date().toLocaleTimeString("en-ZA", {
//             hour: "2-digit",
//             minute: "2-digit",
//           }),
//         },
//       ];

//       const newTotal = newCheckIns.length;
//       const newMilestones = Math.floor(newTotal / CHECKIN_MILESTONE);
//       const oldMilestones = Math.floor(
//         user.checkIns.length / CHECKIN_MILESTONE,
//       );

//       const updated = {
//         ...user,
//         points: user.points + 10,
//         checkIns: newCheckIns,
//       };

//       // ✅ Write ONLY the two fields that changed — not the entire user object.
//       // updateUser calls saveUser which does update(entire user), and on mobile
//       // writing large workouts/bookings/weights arrays on every check-in is what
//       // caused the button to hang. Direct field writes are instant.
//       await Promise.race([
//         Promise.all([
//           set(ref(db, `mk2_users/${user.uid}/checkIns`), newCheckIns),
//           set(ref(db, `mk2_users/${user.uid}/points`), updated.points),
//         ]),
//         new Promise((_, reject) =>
//           setTimeout(
//             () => reject(new Error("Check-in timed out — please try again")),
//             8_000,
//           ),
//         ),
//       ]);
//       // ✅ Sync local state directly — skips the heavy saveUser write entirely
//       setUser({ ...user, points: user.points + 10, checkIns: newCheckIns });

//       logEvent("gym_checkin", { points: updated.points });

//       if (newMilestones > oldMilestones) {
//         const code = generateCode();
//         const earnedAt = Date.now();
//         const expiresAt = earnedAt + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
//         await push(ref(db, `mk2_users/${user.uid}/rewards`), {
//           status: "pending",
//           earnedAt,
//           expiresAt,
//           redemptionCode: code,
//           checkInMilestone: newMilestones * CHECKIN_MILESTONE,
//           type: null,
//         });
//         toast(
//           `🎉 ${newTotal} check-ins! You've earned a reward — choose below!`,
//           "success",
//         );
//         setShowRewardModal(true);
//       } else {
//         toast(
//           `Checked in! +10 points 💪 (${newTotal % CHECKIN_MILESTONE}/${CHECKIN_MILESTONE} to next reward)`,
//           "success",
//         );
//       }
//     } catch (err: any) {
//       // ✅ Surface the actual error so we know what's blocking check-in
//       console.error("doCheckIn error:", err);
//       toast(err?.message ?? "Check-in failed — please try again", "error");
//     } finally {
//       // ✅ Always unlocks — no more lingering button regardless of success/fail/timeout
//       setLoading(false);
//     }
//   };

//   // ── QR scan handler ───────────────────────────────────────────────────────
//   const handleQRScan = async (data: string) => {
//     // ✅ Use ref as the real dedup lock — useState is async and stale on rapid
//     // re-fires from the scanner. The ref flips synchronously so the second call
//     // is blocked before React even re-renders.
//     if (qrScanningRef.current) return;
//     qrScanningRef.current = true;
//     setQrScanning(true);
//     setShowQRScanner(false);
//     setQrError(null);

//     if (import.meta.env.DEV) {
//       console.log("QR scanned:", data);
//     }

//     try {
//       if (data.trim() !== GYM_CHECKIN_QR_CODE) {
//         setQrError(
//           `Invalid QR code scanned. Expected the gym check-in code at reception. (Got: "${data.trim()}")`,
//         );
//         return;
//       }

//       if (checkedToday) {
//         toast("Already checked in today!", "error");
//         return;
//       }

//       if (geoLoading) {
//         toast("Detecting your location… please wait", "info");
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//       }

//       if (!nearGym) {
//         toast(
//           distanceM !== null
//             ? `You're ${distanceM}m away — must be within 20m of MK2R Ruimsig`
//             : "Enable location to check in at MK2R Ruimsig",
//           "error",
//         );
//         return;
//       }

//       await doCheckIn(true); // pass calledFromQR=true — skips duplicate guards
//     } finally {
//       // ✅ Always reset the scan lock — both ref (immediate) and state (UI)
//       qrScanningRef.current = false;
//       setQrScanning(false);
//       // Note: setLoading(false) is handled inside doCheckIn's own finally
//     }
//   };

//   // ── Redeem reward ─────────────────────────────────────────────────────────
//   const redeemReward = async (rewardId: string) => {
//     const choice = rewardChoice[rewardId];
//     if (!choice) return toast("Choose your reward first", "error");
//     setRedeeming(true);
//     try {
//       await set(ref(db, `mk2_users/${user.uid}/rewards/${rewardId}`), {
//         ...rewards[rewardId],
//         status: "redeemed",
//         type: choice,
//         redeemedAt: Date.now(),
//       });
//       toast("🎁 Reward redeemed! Show your code at reception.", "success");
//       setShowRewardModal(false);
//       setRewardChoice((prev) => {
//         const next = { ...prev };
//         delete next[rewardId];
//         return next;
//       });
//     } catch {
//       toast("Redemption failed — try again", "error");
//     }
//     setRedeeming(false);
//   };

//   // ── Mark expired rewards ──────────────────────────────────────────────────
//   useEffect(() => {
//     if (!expiredRewards.length) return;
//     expiredRewards.forEach(async ([id, r]) => {
//       await set(ref(db, `mk2_users/${user.uid}/rewards/${id}`), {
//         ...r,
//         status: "expired",
//       });
//     });
//   }, [expiredRewards.map(([id]) => id).join(",")]);

//   // ── Render ────────────────────────────────────────────────────────────────
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
//                   ✓ You're at MK2R Ruimsig — ready to check in!
//                 </span>
//               ) : distanceM !== null ? (
//                 <span style={{ color: "hsl(20 100% 50%)" }}>
//                   {distanceM}m from gym — must be within 20m to check in
//                 </span>
//               ) : (
//                 <span className="text-muted-foreground">
//                   Tap Enable to detect your location
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

//           {/* QR scanner */}
//           {showQRScanner && (
//             <div
//               className="mb-4 rounded-xl overflow-hidden"
//               style={{ border: "1px solid hsl(20 100% 50% / 0.3)" }}
//             >
//               <div
//                 className="px-4 py-2 flex justify-between items-center"
//                 style={{ background: "hsl(20 100% 50% / 0.08)" }}
//               >
//                 <span
//                   className="text-xs font-bold"
//                   style={{ color: "hsl(20 100% 50%)" }}
//                 >
//                   Scan the gym QR code at reception
//                 </span>
//                 <button
//                   onClick={() => {
//                     setShowQRScanner(false);
//                     setQrError(null);
//                   }}
//                   className="text-xs border-none bg-transparent cursor-pointer text-muted-foreground"
//                 >
//                   ✕ Cancel
//                 </button>
//               </div>
//               <div style={{ minHeight: 300 }}>
//                 <QRScanner onScan={handleQRScan} />
//               </div>
//             </div>
//           )}

//           {/* QR error */}
//           {qrError && (
//             <div
//               className="mb-4 rounded-xl px-4 py-3 text-xs"
//               style={{
//                 background: "hsl(0 84% 51% / 0.08)",
//                 border: "1px solid hsl(0 84% 51% / 0.2)",
//                 color: "hsl(0 84% 51%)",
//               }}
//             >
//               ⚠ {qrError}
//               {import.meta.env.DEV && (
//                 <div className="mt-1 font-mono opacity-60">
//                   Expected: "{GYM_CHECKIN_QR_CODE}"
//                 </div>
//               )}
//             </div>
//           )}

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
//                   : "Scan the QR at reception or use the button below"}
//               </div>

//               {/* QR scan button */}
//               {!checkedToday && (
//                 <button
//                   onClick={() => {
//                     setShowQRScanner((v) => !v);
//                     setQrError(null);
//                   }}
//                   disabled={!nearGym && !geoLoading}
//                   className="w-full mb-2 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
//                   style={{
//                     background: nearGym
//                       ? "hsl(20 100% 50% / 0.12)"
//                       : "hsl(var(--secondary))",
//                     color: nearGym
//                       ? "hsl(20 100% 50%)"
//                       : "hsl(var(--muted-foreground))",
//                     border: `1px solid ${nearGym ? "hsl(20 100% 50% / 0.3)" : "hsl(var(--border))"}`,
//                     cursor: nearGym ? "pointer" : "not-allowed",
//                     opacity: geoLoading ? 0.6 : 1,
//                   }}
//                 >
//                   {qrScanning
//                     ? "Processing…"
//                     : showQRScanner
//                       ? "✕ Close Scanner"
//                       : "📷 Scan QR Code"}
//                 </button>
//               )}

//               <Btn
//                 variant={checkedToday || !nearGym ? "subtle" : "primary"}
//                 size="lg"
//                 onClick={doCheckIn}
//                 disabled={checkedToday || loading || (!nearGym && !geoLoading)}
//                 full
//               >
//                 {loading
//                   ? "Checking in…"
//                   : checkedToday
//                     ? "✓ Checked In Today"
//                     : geoLoading
//                       ? "📍 Detecting location…"
//                       : !nearGym
//                         ? "📍 Not at gym yet"
//                         : "⚡ Check In Now (+10 pts)"}
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
//                                   daysLeft <= 7
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

//                       {r.type && (
//                         <div className="mb-3">
//                           <RedemptionCode code={r.redemptionCode} />
//                         </div>
//                       )}

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
//                             onClick={() =>
//                               setRewardChoice((prev) => ({
//                                 ...prev,
//                                 [id]: choice.val,
//                               }))
//                             }
//                             className="py-3 rounded-xl font-bold text-xs border-none cursor-pointer transition-all text-center"
//                             style={{
//                               background:
//                                 rewardChoice[id] === choice.val
//                                   ? "hsl(20 100% 50%)"
//                                   : "hsl(var(--secondary))",
//                               color:
//                                 rewardChoice[id] === choice.val
//                                   ? "#000"
//                                   : "hsl(var(--foreground))",
//                               border:
//                                 rewardChoice[id] === choice.val
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
//                         disabled={!rewardChoice[id] || redeeming}
//                         className="w-full py-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all"
//                         style={{
//                           background: rewardChoice[id]
//                             ? "hsl(20 100% 50%)"
//                             : "hsl(var(--secondary))",
//                           color: rewardChoice[id]
//                             ? "#000"
//                             : "hsl(var(--muted-foreground))",
//                           cursor: rewardChoice[id] ? "pointer" : "not-allowed",
//                         }}
//                       >
//                         {redeeming
//                           ? "Redeeming…"
//                           : rewardChoice[id]
//                             ? "Redeem & Get Code →"
//                             : "Select a reward above"}
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

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

//       {/* ── Reward modal ──────────────────────────────────────────────────── */}
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
