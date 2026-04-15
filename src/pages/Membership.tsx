import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

// ── PayFast sandbox merchant details ─────────────────────────────────────────
const PAYFAST_MERCHANT_ID = "10000100";
const PAYFAST_MERCHANT_KEY = "46f0cd694581a";
const PAYFAST_BASE = "https://sandbox.payfast.co.za/eng/process";
// When live → "https://www.payfast.co.za/eng/process"

const RETURN_URL = "https://gym-pro-20ee6.web.app";
const CANCEL_URL = "https://gym-pro-20ee6.web.app";
const NOTIFY_URL =
  "https://europe-west1-gym-pro-20ee6.cloudfunctions.net/payfastNotify";

// ── Plans ─────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 0,
    priceAnnual: 0,
    priceLabel: "Free",
    annualLabel: null,
    color: "#9ca3af",
    aiCredits: 0,
    features: [
      "Stay updated on MK2R events",
      "Book a class (Octiv link)",
      "News & info",
      "Events",
      "Internal advertisements",
      "Google Ads",
      "Links to socials",
      "Help articles",
    ],
    locked: [
      "Push notifications",
      "Community chat",
      "Leaderboard",
      "Loyalty card",
      "Discount coupons",
      "Body Tracker",
      "AI Meal Plans",
      "AI Workout Planner",
    ],
    payfastItemName: null,
  },
  {
    id: "silver",
    name: "Silver",
    priceMonthly: 19,
    priceAnnual: 199,
    priceLabel: "R19/mo",
    annualLabel: "R199/yr",
    color: "#cbd5e1",
    aiCredits: 20,
    features: [
      "Book a class (Octiv link)",
      "News & info",
      "Events",
      "Internal advertisements / banners",
      "Google Ads",
      "Links to socials",
      "Help articles",
      "Push notifications",
      "Community chat",
      "Leaderboard",
      "20 AI credits / month",
    ],
    locked: [
      "Gym Loyalty card",
      "Discount coupons",
      "Body Tracker",
      "AI Meal Plans",
      "No Google Ads",
    ],
    payfastItemName: "MK2R Silver Membership - Monthly",
    payfastItemNameAnnual: "MK2R Silver Membership - Annual",
  },
  {
    id: "gold",
    name: "Gold",
    priceMonthly: 49,
    priceAnnual: 499,
    priceLabel: "R49/mo",
    annualLabel: "R499/yr",
    color: "hsl(38 92% 50%)",
    aiCredits: 100,
    features: [
      "Book a class (Octiv link)",
      "News & info",
      "Events",
      "Internal advertisements / banners",
      "No Google Ads",
      "Quick links to socials",
      "Help articles",
      "Push notifications",
      "Community chat",
      "Gym Loyalty card",
      "Discount coupons",
      "Body Tracker",
      "AI Meal Plans",
      "AI Workout Planner",
      "100 AI credits / month",
    ],
    locked: [],
    payfastItemName: "MK2R Gold Membership - Monthly",
    payfastItemNameAnnual: "MK2R Gold Membership - Annual",
  },
] as const;

type Tier = (typeof TIERS)[number];

// ── Build PayFast URL ─────────────────────────────────────────────────────────
function buildPayFastUrl(params: Record<string, string>): string {
  const qs = Object.entries({
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: RETURN_URL,
    cancel_url: CANCEL_URL,
    ...params,
  })
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${PAYFAST_BASE}?${qs}`;
}

function subscriptionUrl(
  tier: Tier,
  annual: boolean,
  userEmail: string,
  userName: string,
  uid: string,
) {
  const amount = annual ? tier.priceAnnual : tier.priceMonthly;
  const itemName = annual
    ? (tier as any).payfastItemNameAnnual
    : tier.payfastItemName;
  return buildPayFastUrl({
    email_address: userEmail,
    name_first: userName.split(" ")[0],
    name_last: userName.split(" ").slice(1).join(" ") || "-",
    item_name: itemName,
    amount: amount.toFixed(2),
    subscription_type: "1",
    billing_date: new Date().toISOString().split("T")[0],
    recurring_amount: amount.toFixed(2),
    frequency: annual ? "6" : "3", // 6 = annual, 3 = monthly
    cycles: "0",
    notify_url: NOTIFY_URL,
    custom_str1: uid,
    custom_str2: tier.id,
    custom_str4: "membership",
  });
}

export function Membership({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  if (!user) return null;

  const aiCredits = (user as any).aiQuota?.remaining ?? 0;
  const aiTotal = (user as any).aiQuota?.total ?? 0;
  const currentTierId = (user as any).membership ?? "basic";
  const currentTier = TIERS.find((t) => t.id === currentTierId) ?? TIERS[0];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Choose the plan that works for you">
        Gym <span className="text-primary">Membership</span>
      </PageTitle>

      {/* ── AI credit balance ───────────────────────────────────────────── */}
      {currentTierId !== "basic" && (
        <div
          className="mk2-card mb-5 flex items-center justify-between gap-4"
          style={{ borderLeft: "3px solid hsl(20 100% 50%)" }}
        >
          <div>
            <div className="font-bold text-sm mb-0.5">AI Credits</div>
            <div className="text-xs text-muted-foreground">
              Used for AI Workout Planner &amp; Nutrition Coach · resets on the
              1st
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-4xl text-primary">
              {aiCredits}
            </div>
            <div className="text-[11px] text-muted-foreground">
              / {aiTotal} remaining
            </div>
          </div>
        </div>
      )}

      {/* ── Sandbox notice ──────────────────────────────────────────────── */}
      <div
        className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
        style={{
          background: "hsl(217 91% 53% / 0.08)",
          border: "1px solid hsl(217 91% 53% / 0.25)",
          color: "hsl(217 91% 53%)",
        }}
      >
        <span className="text-base shrink-0">🔬</span>
        <span>
          <strong>Test mode active</strong> — payments go to PayFast Sandbox.
          Use test card: <strong>4000000000000002</strong> · No real charges.
        </span>
      </div>

      {/* ── Billing toggle ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center mb-8 gap-3">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "hsl(var(--secondary))" }}
        >
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all border-none cursor-pointer font-body flex items-center gap-2"
              style={{
                background: billing === b ? "hsl(20 100% 50%)" : "transparent",
                color: billing === b ? "#000" : "hsl(var(--muted-foreground))",
              }}
            >
              {b === "monthly" ? "Monthly" : "Annual"}
              {b === "annual" && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      billing === "annual"
                        ? "rgba(0,0,0,0.2)"
                        : "hsl(142 72% 37% / 0.2)",
                    color: billing === "annual" ? "#000" : "hsl(142 72% 37%)",
                  }}
                >
                  Save ~15%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 mb-8">
        {TIERS.map((t, i) => {
          const isCurrent = t.id === currentTierId;
          const displayPrice =
            t.priceMonthly === 0
              ? "Free"
              : billing === "annual"
                ? `R${t.priceAnnual}/yr`
                : `R${t.priceMonthly}/mo`;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card rounded-2xl p-5 flex flex-col relative overflow-hidden"
              style={{
                border: isCurrent
                  ? `2px solid ${t.color}`
                  : t.id === "gold"
                    ? `1px solid ${t.color}50`
                    : "1px solid hsl(var(--border))",
                boxShadow:
                  t.id === "gold" ? `0 0 24px ${t.color}18` : undefined,
              }}
            >
              {/* Gold glow strip */}
              {t.id === "gold" && (
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: t.color }}
                />
              )}

              {isCurrent && (
                <div
                  className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${t.color}20`,
                    color: t.color,
                    border: `1px solid ${t.color}40`,
                  }}
                >
                  ✓ Current
                </div>
              )}

              <div
                className="font-display text-2xl mb-1"
                style={{ color: t.color }}
              >
                {t.name}
              </div>
              <div className="font-bold text-2xl mb-0.5">{displayPrice}</div>
              {billing === "annual" && t.annualLabel && (
                <div className="text-[11px] text-muted-foreground mb-4">
                  billed annually · equiv. R{Math.round(t.priceAnnual / 12)}/mo
                </div>
              )}
              {billing === "monthly" && (
                <div className="text-[11px] text-muted-foreground mb-4">
                  {t.priceMonthly === 0
                    ? "No payment needed"
                    : "billed monthly"}
                </div>
              )}

              {/* AI credits badge */}
              {t.aiCredits > 0 && (
                <div
                  className="self-start text-[11px] font-bold px-3 py-1 rounded-full mb-4 flex items-center gap-1.5"
                  style={{
                    background: "hsl(20 100% 50% / 0.1)",
                    color: "hsl(20 100% 50%)",
                    border: "1px solid hsl(20 100% 50% / 0.25)",
                  }}
                >
                  🤖 {t.aiCredits} AI credits/month
                </div>
              )}

              {/* Features */}
              <div className="flex flex-col gap-1.5 mb-5 flex-1">
                {t.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs">
                    <span className="text-green-400 mt-px shrink-0">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {t.locked.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-2 text-xs text-muted-foreground line-through"
                  >
                    <span className="mt-px shrink-0">✕</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div
                  className="text-center text-[12px] font-bold py-3 rounded-xl"
                  style={{ background: `${t.color}15`, color: t.color }}
                >
                  ✓ Your Current Plan
                </div>
              ) : t.priceMonthly === 0 ? (
                <div className="text-center text-[12px] text-muted-foreground py-3 rounded-xl border border-border">
                  Free — no payment needed
                </div>
              ) : (
                <a
                  href={subscriptionUrl(
                    t,
                    billing === "annual",
                    user.email,
                    user.name,
                    user.uid,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-[12px] font-bold py-3 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "hsl(20 100% 50%)",
                    color: "#000",
                    textDecoration: "none",
                  }}
                >
                  {currentTier.priceMonthly > t.priceMonthly
                    ? `Downgrade to ${t.name} →`
                    : `Upgrade to ${t.name} — ${displayPrice} →`}
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Manage existing subscription ───────────────────────────────── */}
      {currentTierId !== "basic" && (
        <div
          className="mk2-card"
          style={{ borderTop: "2px solid hsl(var(--border))" }}
        >
          <div className="font-bold text-sm mb-2 flex items-center gap-2">
            ⚙️ Manage Your Subscription
          </div>
          <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
            To cancel or downgrade, manage your subscription via PayFast.
            Changes take effect at the next billing date.
          </div>
          <a
            href="https://www.payfast.co.za/eng/recurring/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[12px] font-bold py-2.5 px-5 rounded-xl transition-all"
            style={{
              background: "hsl(var(--secondary))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              textDecoration: "none",
            }}
          >
            Manage / Cancel via PayFast →
          </a>
        </div>
      )}

      {/* ── Plans subject to change note ───────────────────────────────── */}
      <div className="mt-6 text-center text-[11px] text-muted-foreground">
        Plans and pricing are subject to change. Current subscribers will be
        notified of any changes in advance.
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// // ── PayFast sandbox merchant details ─────────────────────────────────────────
// // Sandbox: https://sandbox.payfast.co.za
// // When live, swap PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, and BASE_URL
// const PAYFAST_MERCHANT_ID = "10000100"; // PayFast sandbox test merchant ID
// const PAYFAST_MERCHANT_KEY = "46f0cd694581a"; // PayFast sandbox test key
// const PAYFAST_BASE = "https://sandbox.payfast.co.za/eng/process";
// // When live → "https://www.payfast.co.za/eng/process"

// // Return URL after payment — your Firebase hosted URL
// const RETURN_URL = "https://gym-pro-20ee6.web.app";
// const CANCEL_URL = "https://gym-pro-20ee6.web.app";
// // Cloud Function URL — must match region in functions/src/index.ts
// const NOTIFY_URL =
//   "https://europe-west1-gym-pro-20ee6.cloudfunctions.net/payfastNotify";

// // ── Subscription plans with PayFast recurring billing ────────────────────────
// const TIERS = [
//   {
//     id: "basic",
//     name: "Basic",
//     price: "Free",
//     priceNum: 0,
//     color: "#9ca3af",
//     features: [
//       "Dashboard & check-in",
//       "Class schedule (view only)",
//       "Gallery & news",
//       "Membership info",
//     ],
//     locked: ["Leaderboard", "PR Logbook", "AI features", "InBody tracking"],
//     payfastItemName: null,
//   },
//   {
//     id: "silver",
//     name: "Silver",
//     price: "R199/mo",
//     priceNum: 199,
//     color: "#cbd5e1",
//     features: [
//       "Everything in Basic",
//       "Class booking",
//       "Leaderboard",
//       "PR Logbook",
//       "Community feed",
//       "10% class discount",
//     ],
//     locked: ["AI Workout Planner", "AI Nutrition", "InBody tracking"],
//     payfastItemName: "MK2R Silver Membership - Monthly",
//   },
//   {
//     id: "gold",
//     name: "Gold",
//     price: "R349/mo",
//     priceNum: 349,
//     color: "hsl(38 92% 50%)",
//     features: [
//       "Everything in Silver",
//       "AI Workout Planner",
//       "AI Nutrition Coach",
//       "InBody Assessments",
//       "Progress Reports",
//       "20% class discount",
//       "10 free class credits/month",
//     ],
//     locked: [],
//     payfastItemName: "MK2R Gold Membership - Monthly",
//   },
// ];

// // ── Credit packs — one-time purchases ────────────────────────────────────────
// const CREDIT_PACKS = [
//   { credits: 5, price: 150, label: "Starter Pack", badge: null },
//   { credits: 10, price: 270, label: "10-Class Pack", badge: "Popular" },
//   { credits: 20, price: 500, label: "20-Class Pack", badge: "Best Value" },
// ];

// // ── Build PayFast URL ─────────────────────────────────────────────────────────
// function buildPayFastUrl(params: Record<string, string>): string {
//   const qs = Object.entries({
//     merchant_id: PAYFAST_MERCHANT_ID,
//     merchant_key: PAYFAST_MERCHANT_KEY,
//     return_url: RETURN_URL,
//     cancel_url: CANCEL_URL,
//     ...params,
//   })
//     .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
//     .join("&");
//   return `${PAYFAST_BASE}?${qs}`;
// }

// // ── Subscription PayFast URL (recurring) ─────────────────────────────────────
// function subscriptionUrl(
//   tier: (typeof TIERS)[0],
//   userEmail: string,
//   userName: string,
//   uid: string,
// ) {
//   return buildPayFastUrl({
//     email_address: userEmail,
//     name_first: userName.split(" ")[0],
//     name_last: userName.split(" ").slice(1).join(" ") || "-",
//     item_name: tier.payfastItemName!,
//     amount: tier.priceNum.toFixed(2),
//     // Recurring billing fields
//     subscription_type: "1", // 1 = recurring
//     billing_date: new Date().toISOString().split("T")[0],
//     recurring_amount: tier.priceNum.toFixed(2),
//     frequency: "3", // 3 = monthly
//     cycles: "0", // 0 = indefinite
//     notify_url: NOTIFY_URL,
//     // Custom fields — webhook uses these to identify user + action
//     custom_str1: uid, // Firebase UID
//     custom_str2: tier.id, // tier id e.g. "silver"
//     custom_str4: "membership", // payment type
//   });
// }

// // ── Credit pack PayFast URL (once-off) ───────────────────────────────────────
// function creditPackUrl(
//   pack: (typeof CREDIT_PACKS)[0],
//   userEmail: string,
//   userName: string,
//   uid: string,
// ) {
//   return buildPayFastUrl({
//     email_address: userEmail,
//     name_first: userName.split(" ")[0],
//     name_last: userName.split(" ").slice(1).join(" ") || "-",
//     item_name: `MK2R ${pack.label} (${pack.credits} credits)`,
//     amount: pack.price.toFixed(2),
//     notify_url: NOTIFY_URL,
//     // Custom fields — webhook uses these to credit the right user
//     custom_str1: uid, // Firebase UID
//     custom_str3: String(pack.credits), // credits to add
//     custom_str4: "credits", // payment type
//   });
// }

// export function Membership({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [activeSection, setActiveSection] = useState<"plans" | "credits">(
//     "plans",
//   );

//   if (!user) return null;

//   const credits = (user as any).classCredits ?? 0;
//   const currentTier = (user as any).membership ?? "basic";
//   const tier = TIERS.find((t) => t.id === currentTier) ?? TIERS[0];

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Manage your gym membership and class credits">
//         Gym <span className="text-primary">Membership</span>
//       </PageTitle>

//       {/* ── Credit balance ──────────────────────────────────────────────── */}
//       <div className="mk2-card mb-5 flex items-center justify-between gap-4">
//         <div>
//           <div className="font-bold text-base mb-0.5">Class Credits</div>
//           <div className="text-xs text-muted-foreground">
//             1 credit = 1 class booking
//           </div>
//         </div>
//         <div className="text-right shrink-0">
//           <div className="font-display text-4xl text-primary">{credits}</div>
//           <div className="text-[11px] text-muted-foreground">available</div>
//         </div>
//       </div>

//       {/* ── Sandbox notice ──────────────────────────────────────────────── */}
//       <div
//         className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
//         style={{
//           background: "hsl(217 91% 53% / 0.08)",
//           border: "1px solid hsl(217 91% 53% / 0.25)",
//           color: "hsl(217 91% 53%)",
//         }}
//       >
//         <span className="text-base shrink-0">🔬</span>
//         <span>
//           <strong>Test mode active</strong> — payments go to PayFast Sandbox.
//           Use test card: <strong>4000000000000002</strong> · No real charges.
//         </span>
//       </div>

//       {/* ── Section toggle ──────────────────────────────────────────────── */}
//       <div
//         className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
//         style={{ background: "hsl(var(--secondary))" }}
//       >
//         {[
//           { id: "plans", label: "📋 Subscription Plans" },
//           { id: "credits", label: "🎟 Class Credits" },
//         ].map((s) => (
//           <button
//             key={s.id}
//             onClick={() => setActiveSection(s.id as any)}
//             className="px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer font-body"
//             style={{
//               background:
//                 activeSection === s.id ? "hsl(20 100% 50%)" : "transparent",
//               color:
//                 activeSection === s.id
//                   ? "#000"
//                   : "hsl(var(--muted-foreground))",
//             }}
//           >
//             {s.label}
//           </button>
//         ))}
//       </div>

//       {/* ════════════════════════════════════════════════════════════════ */}
//       {/* SUBSCRIPTION PLANS                                               */}
//       {/* ════════════════════════════════════════════════════════════════ */}
//       {activeSection === "plans" && (
//         <>
//           {/* Current plan summary */}
//           <div
//             className="mk2-card mb-6 border-l-4"
//             style={{ borderLeftColor: tier.color }}
//           >
//             <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
//               <div>
//                 <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
//                   Current Plan
//                 </div>
//                 <div
//                   className="font-display text-2xl font-bold"
//                   style={{ color: tier.color }}
//                 >
//                   {tier.name}
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   {tier.price}
//                 </div>
//               </div>
//               <div
//                 className="px-4 py-2 rounded-full text-[11px] font-bold"
//                 style={{
//                   background: `${tier.color}20`,
//                   color: tier.color,
//                   border: `1px solid ${tier.color}40`,
//                 }}
//               >
//                 Active
//               </div>
//             </div>
//             <div className="grid grid-cols-2 gap-1.5 mb-4">
//               {tier.features.map((f) => (
//                 <div key={f} className="flex items-center gap-1.5 text-xs">
//                   <span className="text-green-400">✓</span> {f}
//                 </div>
//               ))}
//               {tier.locked.map((f) => (
//                 <div
//                   key={f}
//                   className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
//                 >
//                   <span>✕</span> {f}
//                 </div>
//               ))}
//             </div>

//             {/* ── Manage / change plan ──────────────────────────────── */}
//             {currentTier !== "basic" && (
//               <div
//                 className="rounded-xl p-3 mt-1"
//                 style={{
//                   background: "hsl(var(--secondary))",
//                   border: "1px solid hsl(var(--border))",
//                 }}
//               >
//                 <div className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
//                   Manage Your Subscription
//                 </div>
//                 <div className="flex flex-wrap gap-2">
//                   {/* PayFast subscription management portal */}
//                   <a
//                     href="https://www.payfast.co.za/eng/recurring/manage"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg transition-all"
//                     style={{
//                       background: "hsl(20 100% 50%)",
//                       color: "#000",
//                       textDecoration: "none",
//                       minWidth: 120,
//                     }}
//                   >
//                     Manage / Cancel via PayFast →
//                   </a>
//                 </div>
//                 <div className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
//                   To <strong className="text-foreground">downgrade</strong> your
//                   plan, cancel your current subscription above and select a new
//                   plan below. Changes take effect at the next billing date. To
//                   upgrade immediately, select a new plan below — PayFast will
//                   handle the transition.
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Plan cards */}
//           <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mb-6">
//             {TIERS.map((t, i) => {
//               const isCurrent = t.id === currentTier;
//               return (
//                 <motion.div
//                   key={t.id}
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: i * 0.07 }}
//                   className="bg-card rounded-xl p-5 flex flex-col"
//                   style={{
//                     border: isCurrent
//                       ? `2px solid ${t.color}`
//                       : "1px solid hsl(var(--border))",
//                   }}
//                 >
//                   <div
//                     className="font-display text-xl mb-0.5"
//                     style={{ color: t.color }}
//                   >
//                     {t.name}
//                   </div>
//                   <div className="font-bold text-lg mb-3">{t.price}</div>
//                   <div className="flex flex-col gap-1.5 mb-5 flex-1">
//                     {t.features.map((f) => (
//                       <div
//                         key={f}
//                         className="flex items-center gap-1.5 text-xs"
//                       >
//                         <span className="text-green-400">✓</span> {f}
//                       </div>
//                     ))}
//                   </div>

//                   {isCurrent ? (
//                     <div
//                       className="text-center text-[11px] font-bold py-2.5 rounded-lg"
//                       style={{ background: `${t.color}20`, color: t.color }}
//                     >
//                       ✓ Your Current Plan
//                     </div>
//                   ) : t.priceNum === 0 ? (
//                     <div className="text-center text-[11px] text-muted-foreground py-2.5 rounded-lg border border-border">
//                       Free — no payment needed
//                     </div>
//                   ) : (
//                     <a
//                       href={subscriptionUrl(t, user.email, user.name, user.uid)}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="block text-center text-[12px] font-bold py-2.5 rounded-lg transition-all"
//                       style={{
//                         background:
//                           t.priceNum <
//                           (TIERS.find((x) => x.id === currentTier)?.priceNum ??
//                             0)
//                             ? "hsl(var(--secondary))"
//                             : "hsl(20 100% 50%)",
//                         color:
//                           t.priceNum <
//                           (TIERS.find((x) => x.id === currentTier)?.priceNum ??
//                             0)
//                             ? "hsl(var(--foreground))"
//                             : "#000",
//                         textDecoration: "none",
//                         border:
//                           t.priceNum <
//                           (TIERS.find((x) => x.id === currentTier)?.priceNum ??
//                             0)
//                             ? "1px solid hsl(var(--border))"
//                             : "none",
//                       }}
//                     >
//                       {t.priceNum <
//                       (TIERS.find((x) => x.id === currentTier)?.priceNum ?? 0)
//                         ? `Downgrade to ${t.name} →`
//                         : `Upgrade to ${t.name} — ${t.price} →`}
//                     </a>
//                   )}
//                 </motion.div>
//               );
//             })}
//           </div>

//           {/* Gold auto-credit note */}
//           {currentTier === "gold" && (
//             <div className="mk2-card border border-orange-500/30 bg-orange-500/5">
//               <div className="flex items-start gap-3">
//                 <span className="text-2xl">🏆</span>
//                 <div>
//                   <div className="font-bold text-sm mb-1">
//                     Gold Monthly Credits
//                   </div>
//                   <div className="text-xs text-muted-foreground">
//                     You automatically receive 10 class credits on the 1st of
//                     each month. They reset monthly and do not roll over.
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </>
//       )}

//       {/* ════════════════════════════════════════════════════════════════ */}
//       {/* CLASS CREDIT PACKS                                               */}
//       {/* ════════════════════════════════════════════════════════════════ */}
//       {activeSection === "credits" && (
//         <>
//           <div className="text-xs text-muted-foreground mb-5 leading-relaxed">
//             Purchase a credit pack below. After payment, your credits will be
//             added within a few minutes. Each credit = 1 class booking.
//           </div>

//           <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
//             {CREDIT_PACKS.map((pack, i) => (
//               <motion.div
//                 key={pack.label}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: i * 0.08 }}
//                 className="bg-card border border-border rounded-xl p-5 flex flex-col"
//               >
//                 {pack.badge && (
//                   <div
//                     className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full mb-3"
//                     style={{
//                       background: "hsl(20 100% 50% / 0.15)",
//                       color: "hsl(20 100% 50%)",
//                       border: "1px solid hsl(20 100% 50% / 0.3)",
//                     }}
//                   >
//                     {pack.badge}
//                   </div>
//                 )}
//                 <div className="font-bold text-base mb-1">{pack.label}</div>
//                 <div className="flex items-baseline gap-2 mb-1">
//                   <div className="font-display text-4xl text-primary">
//                     {pack.credits}
//                   </div>
//                   <div className="text-xs text-muted-foreground mb-1">
//                     credits
//                   </div>
//                 </div>
//                 <div className="text-xs text-muted-foreground mb-1">
//                   R{(pack.price / pack.credits).toFixed(0)} per class
//                 </div>
//                 <div className="font-bold text-xl mb-5 mt-auto pt-3">
//                   R{pack.price}
//                 </div>
//                 <a
//                   href={creditPackUrl(pack, user.email, user.name, user.uid)}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="block text-center text-[12px] font-bold py-2.5 rounded-lg transition-all"
//                   style={{
//                     background: "hsl(20 100% 50%)",
//                     color: "#000",
//                     textDecoration: "none",
//                   }}
//                 >
//                   Buy {pack.credits} Credits — R{pack.price} →
//                 </a>
//               </motion.div>
//             ))}
//           </div>

//           <div className="mk2-card mt-6 border border-border bg-secondary/40">
//             <div className="font-bold text-sm mb-2">💡 How credits work</div>
//             <div className="text-xs text-muted-foreground leading-relaxed">
//               Credits are added to your account after PayFast confirms payment
//               (usually instant in sandbox, 1–2 min live). Gold members get 10
//               free credits on the 1st of each month automatically. Credits do
//               not expire.
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
