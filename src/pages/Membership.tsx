import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 0,
    priceAnnual: 0,
    color: "hsl(217 91% 53%)",
    popular: false,
    tag: "Free forever",
    features: [
      { label: "Book a class (Octiv link)", included: true },
      { label: "News & Info", included: true },
      { label: "Events", included: true },
      { label: "Internal banners & ads", included: true },
      { label: "Google Ads shown", included: true, note: "ads" },
      { label: "Links to socials", included: true },
      { label: "Help articles", included: true },
      { label: "Push notifications", included: false },
      { label: "Community chat", included: false },
      { label: "Leaderboard", included: false },
      { label: "Gym loyalty card", included: false },
      { label: "Discount coupons", included: false },
      { label: "Body Tracker", included: false },
      { label: "Meal Plans", included: false },
    ],
  },
  {
    id: "silver",
    name: "Silver",
    priceMonthly: 19,
    priceAnnual: 199,
    color: "hsl(220 14% 70%)",
    popular: false,
    tag: "Save R29/yr",
    features: [
      { label: "Everything in Basic", included: true },
      { label: "No Google Ads", included: true, note: "nads" },
      { label: "Push notifications", included: true },
      { label: "Quick links to socials", included: true },
      { label: "Community chat", included: true },
      { label: "Leaderboard", included: true },
      { label: "Gym loyalty card", included: true },
      { label: "Discount coupons", included: true },
      { label: "Body Tracker", included: false },
      { label: "Meal Plans", included: false },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    priceMonthly: 49,
    priceAnnual: 499,
    color: "hsl(38 92% 50%)",
    popular: true,
    tag: "Save R89/yr",
    features: [
      { label: "Everything in Silver", included: true },
      { label: "Body Tracker", included: true },
      { label: "Meal Plans", included: true },
      { label: "AI Workout Planner", included: true },
      { label: "InBody Analysis", included: true },
      { label: "BMR Calculator", included: true },
      { label: "Pop-up internal ads", included: true, note: "nads" },
    ],
  },
] as const;

type PlanId = "basic" | "silver" | "gold";

interface MembershipProps {
  setPage?: (page: string) => void;
}

export function Membership({ setPage }: MembershipProps) {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  if (!user) return null;

  const currentTier = ((user as any).membership as PlanId) ?? "basic";

  const pay = (plan: (typeof PLANS)[number]) => {
    if (plan.id === "basic") return;
    const amount = billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
    setLoading(true);
    setSel(plan.id);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://sandbox.payfast.co.za/eng/process";
    const fields: Record<string, string> = {
      merchant_id: "10000100",
      merchant_key: "46f0cd694581a",
      return_url: window.location.href,
      cancel_url: window.location.href,
      notify_url: "https://yourdomain.com/api/payfast-notify",
      name_first: user.name.split(" ")[0],
      name_last: user.name.split(" ")[1] || "",
      email_address: user.email,
      m_payment_id: `MK2-${user.uid.slice(-6)}-${Date.now()}`,
      amount: amount.toFixed(2),
      item_name: `MK2 Rivers ${plan.name} Membership (${billing})`,
      custom_str1: user.uid,
      custom_str2: plan.id,
      custom_str3: billing,
    };
    Object.entries(fields).forEach(([k, v]) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = k;
      i.value = v;
      form.appendChild(i);
    });
    document.body.appendChild(form);
    logEvent("begin_checkout", {
      plan: plan.id,
      billing,
      value: amount,
      currency: "ZAR",
    });
    toast(
      `Redirecting to PayFast — R${amount}/${billing === "annual" ? "yr" : "mo"}…`,
      "info",
    );
    setTimeout(() => {
      form.submit();
      setLoading(false);
    }, 1200);
  };

  return (
    <div
      className={`max-w-[1060px] mx-auto ${
        isMobile ? "px-3 py-4" : "px-6 py-10"
      }`}
    >
      <PageTitle sub="Choose your plan · Secure payment via PayFast">
        Membership <span className="text-primary">Plans</span>
      </PageTitle>

      {currentTier !== "basic" && (
        <div
          className="mb-6 rounded-xl px-5 py-3 flex items-center gap-3 text-sm font-bold flex-wrap"
          style={{
            background: "hsl(20 100% 50% / 0.08)",
            border: "1px solid hsl(20 100% 50% / 0.2)",
            color: "hsl(20 100% 50%)",
          }}
        >
          ⚡ You're on the <span className="uppercase">{currentTier}</span> plan
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Upgrade anytime
          </span>
        </div>
      )}

      <div className="flex justify-center mb-8">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{
            background: "hsl(var(--secondary))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="px-5 py-2 rounded-lg border-none cursor-pointer font-body font-bold text-[12px] uppercase tracking-wide transition-all duration-200"
              style={{
                background: billing === b ? "hsl(20 100% 50%)" : "transparent",
                color: billing === b ? "#000" : "hsl(var(--muted-foreground))",
              }}
            >
              {b === "monthly" ? "Monthly" : "Annual 💰"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-4 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
      >
        {PLANS.map((plan, i) => {
          const price =
            billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
          const billingLabel = billing === "annual" ? "/yr" : "/mo";
          const isCurrent = currentTier === plan.id;
          const isFree = plan.id === "basic";
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="mk2-card relative"
              style={{
                borderTop: `3px solid ${plan.color}`,
                outline: isCurrent ? `2px solid ${plan.color}` : "none",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-px right-4 text-[9px] font-bold px-2.5 py-0.5 rounded-b-md tracking-[0.08em]"
                  style={{ background: plan.color, color: "#000" }}
                >
                  POPULAR
                </div>
              )}
              {isCurrent && (
                <div
                  className="absolute -top-px left-4 text-[9px] font-bold px-2.5 py-0.5 rounded-b-md tracking-[0.08em]"
                  style={{ background: plan.color, color: "#000" }}
                >
                  CURRENT
                </div>
              )}
              <div
                className="font-display text-2xl mb-1"
                style={{ color: plan.color }}
              >
                {plan.name}
              </div>
              {isFree ? (
                <div className="mb-3">
                  <span className="font-display text-[40px] text-foreground">
                    Free
                  </span>
                </div>
              ) : (
                <div className="mb-1">
                  <span
                    className="font-display text-[40px]"
                    style={{ color: plan.color }}
                  >
                    R{price}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {billingLabel}
                  </span>
                </div>
              )}
              {!isFree && billing === "annual" && (
                <div className="text-[11px] mb-2" style={{ color: plan.color }}>
                  💰 {plan.tag}
                </div>
              )}
              <div className="mk2-divider" />
              {plan.features.map((f, fi) => (
                <div
                  key={fi}
                  className="flex gap-2 mb-2 text-xs"
                  style={{
                    color: f.included
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                    opacity: f.included ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      color: f.included ? plan.color : "hsl(var(--border))",
                      flexShrink: 0,
                    }}
                  >
                    {f.included ? "✓" : "–"}
                  </span>
                  {f.label}
                  {(f as any).note === "ads" && (
                    <span className="ml-auto text-[9px] text-muted-foreground">
                      ad-supported
                    </span>
                  )}
                  {(f as any).note === "nads" && (
                    <span
                      className="ml-auto text-[9px] font-bold"
                      style={{ color: plan.color }}
                    >
                      ad-free ✓
                    </span>
                  )}
                </div>
              ))}
              <div className="mt-4">
                {isFree ? (
                  <div
                    className="w-full py-2.5 rounded-lg text-center text-xs font-bold uppercase tracking-wider"
                    style={{
                      background: "hsl(var(--secondary))",
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  >
                    {isCurrent ? "Your current plan" : "No payment needed"}
                  </div>
                ) : (
                  <button
                    onClick={() => pay(plan)}
                    disabled={(loading && sel === plan.id) || isCurrent}
                    className="w-full py-2.5 rounded-lg border-none cursor-pointer font-body font-bold text-sm uppercase tracking-wide transition-all duration-200 active:scale-95"
                    style={{
                      background: isCurrent
                        ? "hsl(var(--secondary))"
                        : plan.color,
                      color: isCurrent
                        ? "hsl(var(--muted-foreground))"
                        : "#000",
                      cursor: isCurrent ? "default" : "pointer",
                    }}
                  >
                    {isCurrent
                      ? "Current plan"
                      : loading && sel === plan.id
                        ? "Redirecting…"
                        : "Upgrade via PayFast"}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div
        className="mk2-card"
        style={{ borderColor: "hsl(142 72% 37% / 0.2)" }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-xl">🔒</span>
          <div className="font-bold text-sm">Secured by PayFast + Firebase</div>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Payments processed by{" "}
          <strong className="text-foreground">PayFast</strong> — SA's leading
          payment gateway. Accepts credit/debit cards, EFT, Instant EFT,
          SnapScan & Mobicred.
          <br />
          Member data stored securely in{" "}
          <strong className="text-foreground">Firebase</strong> (Google Cloud,
          europe-west1).
        </div>
      </div>
    </div>
  );
}
