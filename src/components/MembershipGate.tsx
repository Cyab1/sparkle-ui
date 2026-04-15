import React from "react";
import { useAuth } from "@/context/AuthContext";

export type Tier = "basic" | "silver" | "gold";

const TIER_RANK: Record<Tier, number> = { basic: 0, silver: 1, gold: 2 };

const TIER_STYLE: Record<
  Tier,
  {
    color: string;
    bg: string;
    border: string;
    label: string;
    priceMonthly: string;
    priceAnnual: string;
    aiCredits: number;
  }
> = {
  basic: {
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.1)",
    border: "rgba(156,163,175,0.25)",
    label: "Basic",
    priceMonthly: "Free",
    priceAnnual: "Free",
    aiCredits: 0,
  },
  silver: {
    color: "#cbd5e1",
    bg: "rgba(203,213,225,0.1)",
    border: "rgba(203,213,225,0.3)",
    label: "Silver",
    priceMonthly: "R19/mo",
    priceAnnual: "R199/yr",
    aiCredits: 20,
  },
  gold: {
    color: "hsl(38 92% 50%)",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    label: "Gold",
    priceMonthly: "R49/mo",
    priceAnnual: "R499/yr",
    aiCredits: 100,
  },
};

const TIER_FEATURES: Record<Tier, string[]> = {
  basic: [
    "Stay updated on MK2R events",
    "Book a class (Octiv link)",
    "News & info",
    "Events",
    "Links to socials",
    "Help articles",
  ],
  silver: [
    "Everything in Basic",
    "Push notifications",
    "Community chat",
    "Leaderboard",
    "20 AI credits / month",
  ],
  gold: [
    "Everything in Silver",
    "Gym Loyalty card",
    "Discount coupons",
    "Body Tracker",
    "AI Meal Plans",
    "AI Workout Planner",
    "No Google Ads",
    "100 AI credits / month",
  ],
};

interface Props {
  required: Tier;
  feature: string;
  icon: string;
  children: React.ReactNode;
  setPage: (page: string) => void;
}

export function MembershipGate({
  required,
  feature,
  icon,
  children,
  setPage,
}: Props) {
  const { user } = useAuth();
  const membership = ((user as any)?.membership ?? "basic") as Tier;
  const hasAccess = TIER_RANK[membership] >= TIER_RANK[required];

  if (hasAccess) return <>{children}</>;

  const style = TIER_STYLE[required];
  const features = TIER_FEATURES[required];

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#070707" }}
    >
      {/* Blurred content preview */}
      <div
        className="pointer-events-none select-none"
        style={{
          filter: "blur(7px) brightness(0.3)",
          maxHeight: "50vh",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Fade gradient */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: "25vh",
          height: "26vh",
          background: "linear-gradient(to bottom, transparent, #070707)",
        }}
      />

      {/* Gate card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 pb-20 pt-8">
        <div
          className="w-full max-w-sm rounded-2xl p-6"
          style={{
            background: "rgba(12,12,12,0.95)",
            border: `1px solid ${style.border}`,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: style.bg, border: `1px solid ${style.border}` }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 26, color: style.color }}
              >
                {icon}
              </span>
            </div>
            <div>
              <h2 className="font-display text-white text-lg tracking-wide leading-tight">
                {feature}
              </h2>
              <p className="text-xs font-body mt-0.5" style={{ color: style.color }}>
                Requires {style.label} plan
              </p>
            </div>
          </div>

          {/* Features list */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-body">
              {style.label} plan includes
            </p>
            <ul className="space-y-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-white font-body"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{ background: style.bg, color: style.color }}
                  >
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* AI credits badge */}
          {style.aiCredits > 0 && (
            <div
              className="flex items-center justify-center gap-2 py-2 rounded-xl mb-4 text-xs font-bold"
              style={{
                background: "hsl(20 100% 50% / 0.08)",
                border: "1px solid hsl(20 100% 50% / 0.2)",
                color: "hsl(20 100% 50%)",
              }}
            >
              🤖 {style.aiCredits} AI credits / month included
            </div>
          )}

          {/* Price row */}
          <div
            className="text-center text-xs font-body mb-4 py-2.5 rounded-xl"
            style={{
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
            }}
          >
            <span className="font-bold">{style.label}</span>
            {" · "}
            <span>{style.priceMonthly}</span>
            <span className="opacity-60 mx-1">or</span>
            <span>{style.priceAnnual}</span>
          </div>

          {/* CTAs */}
          <button
            onClick={() => setPage("Membership")}
            className="w-full py-3 rounded-xl font-body font-bold text-sm text-black mb-3 border-none cursor-pointer transition-all active:scale-95"
            style={{ background: style.color }}
          >
            Upgrade to {style.label} →
          </button>
          <button
            onClick={() => setPage("Dashboard")}
            className="w-full py-3 rounded-xl font-body text-sm border cursor-pointer transition-all active:scale-95"
            style={{
              background: "transparent",
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
