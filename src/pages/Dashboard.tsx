import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
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
    tag: "EVENT",
    title: "30-Day Transformation Challenge",
    date: "1 Apr 2026",
    accent: "orange" as const,
  },
  {
    tag: "NEWS",
    title: "New CrossFit Equipment Arrived",
    date: "20 Mar 2026",
    accent: "teal" as const,
  },
  {
    tag: "EVENT",
    title: "Charity Fun Run — 5km & 10km",
    date: "12 Apr 2026",
    accent: "orange" as const,
  },
];

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ── Auto-scrolling News Slider ────────────────────────────────────────────────
function NewsSlider({
  items,
  onViewAll,
}: {
  items: any[];
  onViewAll: () => void;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(
      () => setCurrent((c) => (c + 1) % items.length),
      3500,
    );
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const n = items[current];

  return (
    <div>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.button
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28 }}
            onClick={onViewAll}
            className="relative w-full p-4 text-left cursor-pointer"
            style={{ background: "transparent", border: "none" }}
          >
            {/* Top accent bar */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: 2,
                background:
                  n.accent === "teal" ? "hsl(175 80% 44%)" : "hsl(20 100% 50%)",
              }}
            />
            <div className="flex items-center gap-3 pt-1">
              {n.emoji && <span className="text-xl shrink-0">{n.emoji}</span>}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{
                    color:
                      n.accent === "teal"
                        ? "hsl(175 80% 44%)"
                        : "hsl(20 100% 50%)",
                  }}
                >
                  {n.tag ?? n.type}
                </div>
                <div className="font-display text-base font-bold uppercase leading-tight tracking-wide text-foreground">
                  {n.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {n.date}
                </div>
              </div>
            </div>
          </motion.button>
        </AnimatePresence>

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex gap-1.5 justify-center pb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="border-none cursor-pointer p-0 transition-all"
                style={{
                  width: i === current ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === current ? "hsl(20 100% 50%)" : "hsl(var(--border))",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-foreground">
        {title}
      </h2>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1 text-xs font-medium border-none bg-transparent cursor-pointer"
          style={{ color: "hsl(175 80% 44%)" }}
        >
          {action.label} <span style={{ fontSize: 12 }}>→</span>
        </button>
      )}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "primary" | "teal" | "success";
}) {
  const color = {
    primary: "hsl(20 100% 50%)",
    teal: "hsl(175 80% 44%)",
    success: "hsl(142 72% 37%)",
  }[tone];
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "hsl(var(--secondary))" }}
    >
      <MI icon={icon} size={16} />
      <div className="font-display text-xl font-bold mt-1.5" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  const [verifyDismissed, setVerifyDismissed] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [liveNews, setLiveNews] = useState<any[]>([]);
  const [fabOpen, setFabOpen] = useState(false);

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
  const firstName = user.name.split(" ")[0];
  const isBasicTier = membership === "basic";

  // Enrich live news with accent + tag
  const rawNews = liveNews.length > 0 ? liveNews : NEWS_PREVIEW;
  const newsToShow = rawNews.map((n: any, i: number) => ({
    ...n,
    accent: n.accent ?? (i % 2 === 0 ? "orange" : "teal"),
    tag: n.tag ?? (n.type ?? "NEWS").toUpperCase(),
  }));

  // ── 3 Big Action Buttons ──────────────────────────────────────────────────
  const ACTION_BTNS = [
    {
      label: "Book a Class",
      sub: "Today's schedule",
      icon: "calendar_month",
      page: "Classes",
      bg: "linear-gradient(135deg, hsl(20 100% 50%) 0%, hsl(20 100% 38%) 100%)",
      shadow: "0 10px 30px -12px hsl(20 100% 50% / 0.65)",
      iconBg: "rgba(0,0,0,0.18)",
      color: "#000",
    },
    {
      label: "Start Workout",
      sub: "View your program",
      icon: "fitness_center",
      page: "WorkoutPlanner",
      bg: "linear-gradient(135deg, hsl(175 80% 44%) 0%, hsl(175 80% 33%) 100%)",
      shadow: "0 10px 30px -12px hsl(175 80% 44% / 0.55)",
      iconBg: "rgba(0,0,0,0.15)",
      color: "#000",
    },
    {
      label: "Check In",
      sub: "Earn loyalty points",
      icon: "qr_code_scanner",
      page: "Checkin",
      bg: "hsl(var(--card))",
      shadow: "none",
      iconBg: "hsl(175 80% 44% / 0.15)",
      color: "hsl(var(--foreground))",
      border: "1px solid hsl(var(--border))",
    },
  ];

  // ── FAB speed-dial actions ────────────────────────────────────────────────
  const FAB_ACTIONS = [
    { icon: "qr_code_scanner", label: "Check In", page: "Checkin" },
    { icon: "calendar_month", label: "Book Class", page: "Classes" },
    { icon: "fitness_center", label: "Log Workout", page: "WorkoutPlanner" },
    { icon: "construction", label: "Tools", page: "Tools" },
  ];

  return (
    <div className="relative">
      {/* ── Ambient glow backdrop ──────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden"
        style={{ height: 520 }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: -128,
            left: "50%",
            transform: "translateX(-50%)",
            width: "120%",
            height: 384,
            background: "hsl(175 80% 44% / 0.09)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: -40,
            right: "-20%",
            width: 288,
            height: 288,
            background: "hsl(20 100% 50% / 0.09)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div
        className={`max-w-[1060px] mx-auto ${isMobile ? "px-4 py-5" : "px-6 py-10"}`}
      >
        {/* ①  NOT A MEMBER YET — top of page, basic tier only ──────────── */}
        {isBasicTier && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-5 rounded-2xl p-4 overflow-hidden relative"
            style={{
              background:
                "linear-gradient(135deg, hsl(20 100% 50% / 0.10) 0%, hsl(175 80% 44% / 0.07) 100%)",
              border: "1px solid hsl(20 100% 50% / 0.25)",
            }}
          >
            {/* Decorative glow dot */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                top: -24,
                right: -24,
                width: 100,
                height: 100,
                background: "hsl(20 100% 50% / 0.15)",
                filter: "blur(30px)",
              }}
            />
            <div className="relative">
              <div className="font-display text-base font-bold uppercase tracking-wide mb-0.5">
                Not a member yet?
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                Come check us out — no commitment needed.
              </div>
              <div className="flex gap-2 flex-wrap">
                <a
                  href="https://wa.me/27645386375?text=Hi%2C%20I%27d%20like%20to%20book%20a%20trial%20at%20MK2%20Rivers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(142 72% 37%)",
                    color: "#fff",
                    minWidth: 130,
                  }}
                >
                  🏋️ Book a Trial
                </a>
                <a
                  href="https://app.octivfitness.com/widget/schedule?isDropIn=true&publicToken=93d2cf182bbdb6ffbc7008dc97c9de9041f72351"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(var(--secondary))",
                    color: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--border))",
                    minWidth: 130,
                  }}
                >
                  🚶 Drop-In Session
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ②  GREETING ──────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
          className="mb-7"
        >
          <h1
            className="font-semibold leading-tight text-foreground"
            style={{ fontSize: isMobile ? 26 : 36 }}
          >
            {getGreeting()}, {firstName} 👋
          </h1>

          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 font-medium"
              style={{ color: "hsl(175 80% 44%)" }}
            >
              <MI icon="workspace_premium" size={14} />
              {memberConfig.label} Member
            </span>
            <span className="text-muted-foreground">•</span>
            <span>{user.goal}</span>
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Ready for today&apos;s{" "}
            <span className="font-semibold text-foreground">
              {user.level ?? "training"}
            </span>{" "}
            session?
          </p>
        </motion.header>

        {/* ③  EMAIL VERIFY BANNER ───────────────────────────────────────── */}
        {showVerifyBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{
              borderColor: "hsl(38 92% 50% / 0.4)",
              background: "hsl(38 92% 50% / 0.08)",
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "hsl(38 92% 45%)" }}
            >
              Please verify your email to unlock all features. Check your Junk
              or Spam folder if you don&apos;t see it.
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
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  style={{
                    border: "1px solid hsl(38 92% 50% / 0.4)",
                    background: "hsl(38 92% 50% / 0.18)",
                    color: "hsl(38 92% 45%)",
                  }}
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

        {/* ④  3 BIG ACTION BUTTONS ──────────────────────────────────────── */}
        <section className="mb-8 space-y-3">
          {ACTION_BTNS.map((btn, i) => (
            <motion.button
              key={btn.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08 }}
              onClick={() => setPage(btn.page)}
              className="group w-full rounded-2xl cursor-pointer transition-all active:scale-[0.98] hover:brightness-105 overflow-hidden text-left"
              style={{
                background: btn.bg,
                boxShadow: btn.shadow,
                border: (btn as any).border ?? "none",
              }}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: btn.iconBg }}
                >
                  <MI icon={btn.icon} size={24} />
                </div>
                <div className="flex-1">
                  <div
                    className="font-display text-lg font-bold uppercase tracking-wide leading-tight"
                    style={{ color: btn.color }}
                  >
                    {btn.label}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: btn.color, opacity: 0.8 }}
                  >
                    {btn.sub}
                  </div>
                </div>
                <span
                  className="transition group-hover:translate-x-0.5"
                  style={{ color: btn.color, opacity: 0.7 }}
                >
                  <MI icon="chevron_right" size={22} />
                </span>
              </div>
            </motion.button>
          ))}
        </section>

        {/* ⑤  MY PROGRESS ──────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="mb-8"
        >
          <SectionHead title="My Progress" />
          <div
            className="rounded-2xl p-4"
            style={{
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
          >
            {/* 3 stat tiles */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon="bolt"
                label="Workouts"
                value={String(user.workouts.length)}
                tone="primary"
              />
              <StatTile
                icon="calendar_month"
                label="Classes / mo"
                value={String(user.bookings.length)}
                tone="teal"
              />
              <StatTile
                icon="where_to_vote"
                label="Check-ins"
                value={String(user.checkIns.length)}
                tone="success"
              />
            </div>

            {/* Quick-link buttons: PR Logbook · Leaderboard · Measure */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "PR Logbook", page: "PRLogbook" },
                { label: "Leaderboard", page: "Leaderboard" },
                { label: "Measure", page: "InBody" },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => setPage(a.page)}
                  className="rounded-xl py-2.5 text-xs font-medium text-foreground transition cursor-pointer"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--secondary))",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "hsl(175 80% 44% / 0.6)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "hsl(var(--border))";
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ⑥  COMMUNITY ────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="mb-8"
        >
          <SectionHead title="Community" />
          <div
            className="rounded-2xl p-4 cursor-pointer transition-colors"
            style={{
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
            }}
            onClick={() => setPage("Community")}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  background: "hsl(20 100% 50% / 0.15)",
                  color: "hsl(20 100% 50%)",
                }}
              >
                <MI icon="groups" size={24} />
              </div>
              <div className="flex-1">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(175 80% 44%)" }}
                >
                  Upcoming event
                </div>
                <div className="font-display text-base font-bold uppercase tracking-wide text-foreground mt-0.5">
                  MK2R Unicorn Games
                </div>
                <div className="text-xs text-muted-foreground">
                  30 May 2026 · Two Rivers HQ
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="h-10 rounded-xl font-display text-xs font-bold uppercase tracking-wider border-none cursor-pointer transition hover:brightness-105"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPage("Community");
                }}
              >
                Join Event
              </button>
              <button
                className="h-10 rounded-xl font-display text-xs font-bold uppercase tracking-wider cursor-pointer transition"
                style={{
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPage("Community");
                }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <MI icon="chat" size={16} /> Chat
                </span>
              </button>
            </div>
          </div>
        </motion.section>

        {/* ⑦  NEWS & EVENTS — auto-scrolling slider ────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          className="mb-8"
        >
          <SectionHead
            title="News & Events"
            action={{ label: "See all", onClick: () => setPage("News") }}
          />
          <NewsSlider items={newsToShow} onViewAll={() => setPage("News")} />
        </motion.section>
      </div>

      {/* ── FAB speed-dial ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed z-40 flex flex-col items-end gap-2"
        style={{ bottom: isMobile ? 88 : 24, right: 20 }}
      >
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto flex flex-col items-end gap-2"
            >
              {FAB_ACTIONS.map((a, i) => (
                <motion.button
                  key={a.label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    setFabOpen(false);
                    setPage(a.page);
                  }}
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-foreground cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}
                >
                  <span style={{ color: "hsl(175 80% 44%)" }}>
                    <MI icon={a.icon} size={16} />
                  </span>
                  {a.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFabOpen((v) => !v)}
          className="pointer-events-auto w-14 h-14 rounded-full border-none cursor-pointer flex items-center justify-center"
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          style={{
            background: "hsl(20 100% 50%)",
            color: "#000",
            boxShadow: "0 12px 32px -8px hsl(20 100% 50% / 0.65)",
          }}
        >
          <MI icon={fabOpen ? "close" : "add"} size={26} />
        </motion.button>
      </div>
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

// // ── News Slider ───────────────────────────────────────────────────────────────
// function NewsSlider({ items }: { items: any[] }) {
//   const [current, setCurrent] = useState(0);

//   useEffect(() => {
//     if (items.length <= 1) return;
//     const timer = setInterval(() => {
//       setCurrent((c) => (c + 1) % items.length);
//     }, 3500);
//     return () => clearInterval(timer);
//   }, [items.length]);

//   if (!items.length) return null;

//   const n = items[current];

//   return (
//     <div>
//       <AnimatePresence mode="wait">
//         <motion.div
//           key={current}
//           initial={{ opacity: 0, x: 24 }}
//           animate={{ opacity: 1, x: 0 }}
//           exit={{ opacity: 0, x: -24 }}
//           transition={{ duration: 0.28 }}
//           className="flex items-center gap-3 py-1.5"
//         >
//           <span className="text-xl shrink-0">{n.emoji}</span>
//           <div className="flex-1 min-w-0">
//             <div className="text-xs font-medium truncate text-foreground">
//               {n.title}
//             </div>
//             <div className="text-[10px] text-muted-foreground">{n.date}</div>
//           </div>
//           {n.type && (
//             <span
//               className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
//               style={{
//                 background: "hsl(20 100% 50% / 0.12)",
//                 color: "hsl(20 100% 45%)",
//               }}
//             >
//               {n.type}
//             </span>
//           )}
//         </motion.div>
//       </AnimatePresence>

//       {/* Dot indicators */}
//       {items.length > 1 && (
//         <div className="flex gap-1.5 mt-2 justify-center">
//           {items.map((_, i) => (
//             <button
//               key={i}
//               onClick={() => setCurrent(i)}
//               className="border-none cursor-pointer p-0 transition-all"
//               style={{
//                 width: i === current ? 16 : 6,
//                 height: 6,
//                 borderRadius: 3,
//                 background:
//                   i === current ? "hsl(20 100% 50%)" : "hsl(var(--border))",
//               }}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Dashboard ─────────────────────────────────────────────────────────────────
// export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile, isTablet } = useBreakpoint();

//   const [verifyDismissed, setVerifyDismissed] = useState(false);
//   const [resendSent, setResendSent] = useState(false);
//   const [resending, setResending] = useState(false);
//   const [liveNews, setLiveNews] = useState<any[]>([]);

//   useEffect(() => {
//     if (!user) return;
//     return onValue(ref(db, "admin_news"), (snap) => {
//       if (!snap.exists()) return;
//       const items = Object.values(snap.val()) as any[];
//       const sorted = items.sort(
//         (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
//       );
//       setLiveNews(sorted.slice(0, 3));
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
//         <div className="mt-1.5 mb-1">
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
//         <div className="text-muted-foreground text-xs">
//           {user.goal} · {user.level}
//         </div>
//       </div>

//       {/* ── Email verify banner ─────────────────────────────────────────── */}
//       {showVerifyBanner && (
//         <motion.div
//           initial={{ opacity: 0, y: -8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-center justify-between gap-3"
//         >
//           <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
//             Please verify your email address to unlock all features. If you
//             don't see the verification email in your inbox, please check your
//             Junk or Spam folder
//           </span>
//           <div className="flex items-center gap-2 shrink-0">
//             {resendSent ? (
//               <span className="text-[10px] text-green-500 font-bold">
//                 Sent!
//               </span>
//             ) : (
//               <button
//                 onClick={resendVerification}
//                 disabled={resending}
//                 className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-yellow-500/40 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 cursor-pointer"
//               >
//                 {resending ? "Sending…" : "Resend"}
//               </button>
//             )}
//             <button
//               onClick={() => setVerifyDismissed(true)}
//               className="text-muted-foreground text-sm bg-transparent border-none cursor-pointer"
//             >
//               ✕
//             </button>
//           </div>
//         </motion.div>
//       )}

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

//       {/* ── Loyalty Program / Check-in progress ────────────────────────── */}
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

//       {/* ── Not a member yet? ───────────────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.38 }}
//         className="mb-4 rounded-xl p-4"
//         style={{
//           background: "hsl(20 100% 50% / 0.05)",
//           border: "1px solid hsl(20 100% 50% / 0.2)",
//         }}
//       >
//         <div className="font-bold text-sm mb-1">Not a member yet?</div>
//         <div className="text-xs text-muted-foreground mb-3">
//           Come check us out — no commitment needed.
//         </div>
//         <div className="flex gap-2 flex-wrap">
//           <a
//             href="https://wa.me/27645386375?text=Hi%2C%20I%27d%20like%20to%20book%20a%20trial%20at%20MK2%20Rivers"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="flex-1 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
//             style={{
//               background: "hsl(142 72% 37%)",
//               color: "#fff",
//               minWidth: 140,
//             }}
//           >
//             🏋️ Book a Trial
//           </a>
//           <a
//             href="https://app.octivfitness.com/widget/schedule?isDropIn=true&publicToken=93d2cf182bbdb6ffbc7008dc97c9de9041f72351"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="flex-1 py-2.5 rounded-xl font-bold text-sm border-none cursor-pointer transition-all active:scale-95 text-center no-underline flex items-center justify-center gap-2"
//             style={{
//               background: "hsl(var(--secondary))",
//               color: "hsl(var(--foreground))",
//               border: "1px solid hsl(var(--border))",
//               minWidth: 140,
//             }}
//           >
//             🚶 Drop-In Session
//           </a>
//         </div>
//       </motion.div>

//       {/* ── News & Events ──────────────────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.4 }}
//         className="mk2-card mb-4"
//         style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//       >
//         <div
//           className="flex items-center justify-between mb-3 cursor-pointer"
//           onClick={() => setPage("News")}
//         >
//           <span
//             className="font-display tracking-wide text-primary"
//             style={{ fontSize: 15 }}
//           >
//             News & Events
//           </span>
//           <span className="text-[10px] text-primary font-bold">View all →</span>
//         </div>

//         <NewsSlider items={newsToShow} />
//       </motion.div>

//       {/* ── Community ──────────────────────────────────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.42 }}
//         className="mk2-card cursor-pointer hover:border-primary/30 transition-colors mb-4"
//         onClick={() => setPage("Community")}
//         style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//       >
//         <div className="flex items-center justify-between">
//           <div>
//             <div
//               className="font-display text-base tracking-wide"
//               style={{ color: "hsl(20 100% 50%)" }}
//             >
//               Community
//             </div>
//             <div className="text-xs text-muted-foreground mt-0.5">
//               Connect with fellow MK2R members
//             </div>
//           </div>
//           <div
//             className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
//             style={{ background: "hsl(20 100% 50% / 0.15)" }}
//           >
//             <MI icon="groups" size={20} />
//           </div>
//         </div>
//       </motion.div>

//       {/* ── My Progress — PR Logbook + Leaderboard ──────────────────────── */}
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5 }}
//         className="mk2-card"
//         style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
//       >
//         <div
//           className="font-display tracking-wide mb-3"
//           style={{ color: "hsl(20 100% 50%)", fontSize: 15 }}
//         >
//           My Progress
//         </div>
//         <div className="grid grid-cols-2 gap-2">
//           {[
//             { label: "PR Logbook", icon: "emoji_events", page: "PRLogbook" },
//             { label: "Leaderboard", icon: "leaderboard", page: "Leaderboard" },
//           ].map((a) => (
//             <button
//               key={a.label}
//               onClick={() => setPage(a.page)}
//               // ── FIXED: tighter gap + padding so "Leaderboard" fits on one
//               //    line on mobile; reduced tracking on the label ────────────
//               className="bg-secondary border border-border rounded-xl flex items-center gap-2 py-3 px-3 cursor-pointer hover:border-primary/30 transition-all text-left w-full"
//             >
//               <MI icon={a.icon} size={18} />
//               <span
//                 className="font-display text-primary leading-tight"
//                 style={{ fontSize: 13, letterSpacing: "0.04em" }}
//               >
//                 {a.label}
//               </span>
//             </button>
//           ))}
//         </div>
//       </motion.div>
//     </div>
//   );
// }
