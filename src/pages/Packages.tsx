import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ref, get, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { PageTitle } from "@/components/shared/PageTitle";
import {
  initiatePayFastForPack,
  getRemainingMonthlyBookings,
} from "@/lib/Bookingengine";
import {
  getTierFamily,
  TIER_RULES,
  type MembershipTier,
  type CreditPack,
} from "@/types/booking";

// ── Tier display config ───────────────────────────────────────────────────────
const TIER_CONFIG: Record<
  string,
  { label: string; color: string; family: string }
> = {
  basic: { label: "Basic", color: "hsl(0 0% 55%)", family: "basic" },
  u18: { label: "Under 18's", color: "hsl(142 72% 37%)", family: "u18" },
  hybrid_12m: {
    label: "Hybrid 3× (12mo)",
    color: "hsl(217 91% 53%)",
    family: "hybrid",
  },
  hybrid_6m: {
    label: "Hybrid 3× (6mo)",
    color: "hsl(217 91% 53%)",
    family: "hybrid",
  },
  hybrid_m2m: {
    label: "Hybrid 3× (M2M)",
    color: "hsl(217 91% 53%)",
    family: "hybrid",
  },
  unlimited_12m: {
    label: "Unlimited (12mo)",
    color: "hsl(20 100% 50%)",
    family: "unlimited",
  },
  unlimited_6m: {
    label: "Unlimited (6mo)",
    color: "hsl(20 100% 50%)",
    family: "unlimited",
  },
  unlimited_m2m: {
    label: "Unlimited (M2M)",
    color: "hsl(20 100% 50%)",
    family: "unlimited",
  },
};

// ── Default credit packs (admin can override these in Firebase) ───────────────
const DEFAULT_PACKS: CreditPack[] = [
  {
    id: "drop1",
    name: "Single drop-in",
    description: "One class, pay as you go. No commitment.",
    credits: 1,
    price: 250,
    badge: undefined,
    active: true,
    perClassRate: 250,
  },
  {
    id: "pack5",
    name: "5-class pack",
    description: "Pre-purchase 5 class credits.",
    credits: 5,
    price: 1150,
    badge: undefined,
    active: true,
    perClassRate: 230,
  },
  {
    id: "pack10",
    name: "10-class pack",
    description: "Best per-class rate for regular drop-ins.",
    credits: 10,
    price: 2200,
    badge: "Best value",
    active: true,
    perClassRate: 220,
  },
];

// ── Monthly class limits per tier family ─────────────────────────────────────
const TIER_PRICE_MAP: Record<MembershipTier, string> = {
  basic: "Free",
  u18: "R700/mo",
  hybrid_12m: "R950/mo",
  hybrid_6m: "R1 065/mo",
  hybrid_m2m: "R1 150/mo",
  unlimited_12m: "R1 150/mo",
  unlimited_6m: "R1 265/mo",
  unlimited_m2m: "R1 390/mo",
};

// ─────────────────────────────────────────────────────────────────────────────
export function Packages({ setPage }: { setPage?: (p: string) => void }) {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_PACKS);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{
    used: number;
    max: number;
    remaining: number;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<CreditPack | null>(
    null,
  );

  // ── Check URL for PayFast return status ───────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      toast(
        "Payment successful! Credits have been added to your account.",
        "success",
      );
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "cancelled") {
      toast("Payment cancelled. No charges made.", "info");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Load credit packs from Firebase (admin-editable) ─────────────────────
  useEffect(() => {
    return onValue(ref(db, "packages"), (snap) => {
      if (snap.exists()) {
        const list: CreditPack[] = Object.entries(snap.val())
          .map(([id, val]: [string, any]) => ({
            id,
            ...val,
            perClassRate:
              val.credits > 0 ? Math.round(val.price / val.credits) : val.price,
          }))
          .filter((p) => p.active)
          .sort((a, b) => a.price - b.price);
        setPacks(list);
      }
    });
  }, []);

  // ── Load remaining monthly classes ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getRemainingMonthlyBookings(
      user.uid,
      user.membership as MembershipTier,
    ).then(setRemaining);
  }, [user?.uid, user?.membership]);

  if (!user) return null;

  const tier = user.membership as MembershipTier;
  const tierConf = TIER_CONFIG[tier] ?? TIER_CONFIG.basic;
  const family = getTierFamily(tier);
  const rules = TIER_RULES[family];
  const isMember = family !== "basic";
  const credits = user.classCredits ?? 0;

  const handleBuyPack = async (pack: CreditPack) => {
    if (purchasing) return;
    setPurchasing(pack.id);
    try {
      await initiatePayFastForPack(
        pack.id,
        pack.name,
        pack.price,
        pack.credits,
        user as any,
      );
      // Page redirects — no further action needed here
    } catch (err) {
      console.error(err);
      toast("Could not initiate payment. Please try again.", "error");
      setPurchasing(null);
    }
  };

  return (
    <div
      className={`max-w-[900px] mx-auto ${isMobile ? "px-4 py-5" : "px-6 py-10"}`}
    >
      <PageTitle
        sub={
          isMember
            ? "Your membership details and class allowance"
            : "Buy class credits or upgrade to a membership"
        }
      >
        Packages &amp; <span className="text-primary">Credits</span>
      </PageTitle>

      {/* ── MEMBERSHIP STATUS CARD ─────────────────────────────────────────── */}
      <div
        className="mb-8 rounded-2xl p-5"
        style={{
          background: `${tierConf.color}10`,
          border: `1px solid ${tierConf.color}35`,
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-widest mb-1"
              style={{ color: tierConf.color }}
            >
              Your membership
            </div>
            <div
              className="font-bold text-xl"
              style={{ color: tierConf.color }}
            >
              {tierConf.label}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {TIER_PRICE_MAP[tier]}
              {isMember && " · Managed by the gym"}
            </div>
          </div>

          {/* Credit balance (always shown) */}
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Class credits
            </div>
            <div
              className="font-bold text-3xl"
              style={{
                color:
                  credits > 0
                    ? "hsl(142 72% 37%)"
                    : "hsl(var(--muted-foreground))",
              }}
            >
              {credits}
            </div>
            <div className="text-xs text-muted-foreground">remaining</div>
          </div>
        </div>

        {/* ── Member: remaining allowance bar ──────────────────────────────── */}
        {isMember && remaining && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Monthly classes used</span>
              <span>
                <span style={{ color: tierConf.color }} className="font-bold">
                  {remaining.used}
                </span>
                {" / "}
                {remaining.max}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (remaining.used / remaining.max) * 100)}%`,
                  background:
                    remaining.remaining <= 2
                      ? "hsl(0 84% 51%)"
                      : tierConf.color,
                }}
              />
            </div>
            {remaining.remaining <= 3 && (
              <div
                className="text-xs mt-1.5 font-bold"
                style={{
                  color:
                    remaining.remaining === 0
                      ? "hsl(0 84% 51%)"
                      : "hsl(38 92% 44%)",
                }}
              >
                {remaining.remaining === 0
                  ? "Monthly limit reached. Resets in a rolling 30-day window."
                  : `${remaining.remaining} class${remaining.remaining !== 1 ? "es" : ""} remaining this month.`}
              </div>
            )}
          </div>
        )}

        {/* ── Member: what's included ───────────────────────────────────────── */}
        {isMember && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
            {(rules.allowedCategories.length > 0
              ? rules.allowedCategories
              : [
                  "Crossfit",
                  "Gymnastics",
                  "Strength",
                  "Olympic Lifting",
                  "Saturday Smasher",
                  "Open Gym",
                ]
            ).map((cat) => (
              <span
                key={cat}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: `${tierConf.color}15`,
                  color: tierConf.color,
                  border: `1px solid ${tierConf.color}30`,
                }}
              >
                ✓ {cat}
              </span>
            ))}
            {rules.allowedCategories.length > 0 &&
              ["Open Gym"]
                .filter((c) => !rules.allowedCategories.includes(c))
                .map((cat) => (
                  <span
                    key={cat}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: "hsl(0 0% 50% / 0.1)",
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  >
                    ✗ {cat}
                  </span>
                ))}
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full ml-1"
              style={{
                background: "hsl(var(--secondary))",
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {rules.maxBookingsPerDay} booking
              {rules.maxBookingsPerDay !== 1 ? "s" : ""}/day
            </span>
          </div>
        )}

        {/* ── Non-member: upgrade nudge ─────────────────────────────────────── */}
        {!isMember && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">
              Want unlimited classes? Contact the gym to upgrade your
              membership.
            </div>
            <a
              href="tel:0645386375"
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg"
              style={{ background: tierConf.color, color: "#000" }}
            >
              📞 064 538 6375 — Call to upgrade
            </a>
          </div>
        )}
      </div>

      {/* ── CREDIT PACKS ──────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="font-bold text-base mb-1">Class credit packs</div>
        <div className="text-xs text-muted-foreground">
          Credits work for any class, any date. Members and non-members can buy
          them — useful as a backup or gift.
        </div>
      </div>

      <div
        className={`grid gap-4 mb-10 ${
          isMobile
            ? "grid-cols-1"
            : "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]"
        }`}
      >
        {packs.map((pack, i) => {
          const isBest = pack.badge === "Best value";
          const isBuying = purchasing === pack.id;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl overflow-hidden relative"
              style={{
                border: isBest
                  ? "2px solid hsl(20 100% 50%)"
                  : "1px solid hsl(var(--border))",
              }}
            >
              {/* Best value ribbon */}
              {pack.badge && (
                <div
                  className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "hsl(20 100% 50%)",
                    color: "#000",
                  }}
                >
                  {pack.badge}
                </div>
              )}

              <div className="p-5">
                <div className="font-bold text-base mb-1">{pack.name}</div>
                <div className="text-xs text-muted-foreground mb-4">
                  {pack.description}
                </div>

                {/* Price display */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span
                    className="font-bold text-3xl"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    R{pack.price.toLocaleString("en-ZA")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    for {pack.credits} credit{pack.credits !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Per-class rate */}
                <div className="text-xs text-muted-foreground mb-5">
                  R{pack.perClassRate}/class
                  {isBest && (
                    <span
                      className="ml-1.5 font-bold"
                      style={{ color: "hsl(142 72% 37%)" }}
                    >
                      — best rate
                    </span>
                  )}
                </div>

                {/* What you get */}
                <div
                  className="flex items-center gap-2 text-xs mb-5 p-2.5 rounded-lg"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  <span
                    className="font-bold text-lg"
                    style={{ color: "hsl(20 100% 50%)" }}
                  >
                    {pack.credits}
                  </span>
                  <span className="text-muted-foreground">
                    class credit{pack.credits !== 1 ? "s" : ""} · any class ·
                    any date
                  </span>
                </div>

                {/* Buy button */}
                <button
                  onClick={() => handleBuyPack(pack)}
                  disabled={!!purchasing}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity"
                  style={{
                    background: isBest
                      ? "hsl(20 100% 50%)"
                      : "hsl(var(--secondary))",
                    color: isBest ? "#000" : "hsl(var(--foreground))",
                    border: isBest ? "none" : "1px solid hsl(var(--border))",
                    opacity: purchasing ? 0.6 : 1,
                    cursor: purchasing ? "not-allowed" : "pointer",
                  }}
                >
                  {isBuying
                    ? "Redirecting to PayFast…"
                    : `Pay R${pack.price.toLocaleString("en-ZA")} via PayFast →`}
                </button>
              </div>

              {/* PayFast trust badge */}
              <div
                className="px-5 py-2 text-center text-[10px] text-muted-foreground"
                style={{ borderTop: "1px solid hsl(var(--border))" }}
              >
                🔒 Secure payment via PayFast · EFT, card &amp; instant EFT
                accepted
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── HOW CREDITS WORK ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 mb-8"
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <div className="font-bold text-sm mb-3">How class credits work</div>
        <div
          className="grid gap-3 text-xs text-muted-foreground"
          style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}
        >
          {[
            ["🎟", "1 credit = 1 class booking, any class type, any date"],
            [
              "💳",
              "Pay once via PayFast — credits land instantly after payment",
            ],
            ["♾️", "Credits never expire — use them at your own pace"],
            [
              "↩️",
              "Cancel a booking and your credit is automatically refunded",
            ],
          ].map(([icon, text]) => (
            <div key={text} className="flex gap-2 items-start">
              <span className="text-base leading-none mt-0.5">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FULL MEMBERSHIP TIERS ─────────────────────────────────────────────── */}
      <div className="font-bold text-base mb-1">Full membership tiers</div>
      <div className="text-xs text-muted-foreground mb-4">
        Contact the gym to sign up. Memberships are managed at reception.
      </div>

      <div className="flex flex-col gap-3">
        {(
          [
            {
              name: "Under 18's",
              price: "R700/mo",
              term: "12-month contract",
              classes: "Up to 24 classes/month",
              perDay: "1 booking/day",
              includes: ["Crossfit"],
              color: "hsl(142 72% 37%)",
            },
            {
              name: "Hybrid 3×Week",
              price: "From R950/mo",
              term: "12, 6-month or month-to-month",
              classes: "Up to 14 classes/month",
              perDay: "1 booking/day",
              includes: [
                "Crossfit",
                "Gymnastics",
                "Strength",
                "Olympic Lifting",
                "Saturday Smasher",
              ],
              color: "hsl(217 91% 53%)",
            },
            {
              name: "Unlimited",
              price: "From R1 150/mo",
              term: "12, 6-month or month-to-month",
              classes: "Up to 50 classes/month",
              perDay: "2 bookings/day",
              includes: ["All classes including Open Gym"],
              color: "hsl(20 100% 50%)",
              featured: true,
            },
          ] satisfies Array<{
            name: string;
            price: string;
            term: string;
            classes: string;
            perDay: string;
            includes: readonly string[];
            color: string;
            featured?: boolean;
          }>
        ).map((m) => (
          <div
            key={m.name}
            className="rounded-xl p-4 flex flex-wrap justify-between gap-4"
            style={{
              background: `${m.color}08`,
              border: m.featured
                ? `2px solid ${m.color}50`
                : `1px solid ${m.color}25`,
            }}
          >
            <div>
              <div className="font-bold text-sm" style={{ color: m.color }}>
                {m.name}
                {m.featured && (
                  <span
                    className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${m.color}20`, color: m.color }}
                  >
                    Most popular
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {m.term}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {m.includes.map((inc) => (
                  <span
                    key={inc}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: `${m.color}12`,
                      color: m.color,
                      border: `1px solid ${m.color}25`,
                    }}
                  >
                    {inc}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl" style={{ color: m.color }}>
                {m.price}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {m.classes}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {m.perDay}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a
          href="tel:0645386375"
          className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl"
          style={{ background: "hsl(20 100% 50%)", color: "#000" }}
        >
          📞 Call 064 538 6375 to sign up
        </a>
        <div className="text-xs text-muted-foreground mt-2">
          Or email mktrfitness@gmail.com
        </div>
      </div>
    </div>
  );
}
