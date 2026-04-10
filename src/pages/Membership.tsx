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
const NOTIFY_URL = "https://gym-pro-20ee6.web.app/api/payfast-notify";

// ── Subscription plans ────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    priceNum: 0,
    color: "#9ca3af",
    features: [
      "Dashboard & check-in",
      "Class schedule (view only)",
      "Gallery & news",
      "Membership info",
    ],
    locked: [
      "Class booking",
      "Leaderboard",
      "PR Logbook",
      "AI features",
      "InBody tracking",
    ],
    payfastItemName: null,
  },
  {
    id: "silver",
    name: "Silver",
    price: "R199/mo",
    priceNum: 199,
    color: "#cbd5e1",
    features: [
      "Everything in Basic",
      "Class booking (credits system)",
      "Leaderboard",
      "PR Logbook",
      "Community feed",
      "10% class discount",
    ],
    locked: ["AI Workout Planner", "AI Nutrition", "InBody tracking"],
    payfastItemName: "MK2R Silver Membership - Monthly",
  },
  {
    id: "gold",
    name: "Gold",
    price: "R349/mo",
    priceNum: 349,
    color: "hsl(38 92% 50%)",
    features: [
      "Everything in Silver",
      "AI Workout Planner (200 calls/month)",
      "AI Nutrition Coach",
      "InBody Assessments",
      "Progress Reports",
      "20% class discount",
      "10 free class credits/month",
    ],
    locked: [],
    payfastItemName: "MK2R Gold Membership - Monthly",
  },
];

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

// ── Subscription PayFast URL (recurring) ─────────────────────────────────────
function subscriptionUrl(
  tier: (typeof TIERS)[0],
  userEmail: string,
  userName: string,
) {
  return buildPayFastUrl({
    email_address: userEmail,
    name_first: userName.split(" ")[0],
    name_last: userName.split(" ").slice(1).join(" ") || "-",
    item_name: tier.payfastItemName!,
    amount: tier.priceNum.toFixed(2),
    subscription_type: "1",
    billing_date: new Date().toISOString().split("T")[0],
    recurring_amount: tier.priceNum.toFixed(2),
    frequency: "3",
    cycles: "0",
    notify_url: NOTIFY_URL,
  });
}

export function Membership({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  if (!user) return null;

  const currentTier = (user as any).membership ?? "basic";
  const tier = TIERS.find((t) => t.id === currentTier) ?? TIERS[0];

  // AI quota (set by Cloud Functions, read-only from client)
  const aiQuota = (user as any).aiQuota ?? null;
  const aiQuotaTotal =
    currentTier === "gold" ? 200 : currentTier === "silver" ? 50 : 0;
  const aiQuotaUsed = aiQuota ? aiQuotaTotal - (aiQuota.remaining ?? 0) : 0;
  const aiQuotaLeft = aiQuota?.remaining ?? 0;

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Manage your gym membership">
        Gym <span className="text-primary">Membership</span>
      </PageTitle>

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

      {/* ── Current plan summary ─────────────────────────────────────────── */}
      <div
        className="mk2-card mb-6 border-l-4"
        style={{ borderLeftColor: tier.color }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
              Current Plan
            </div>
            <div
              className="font-display text-2xl font-bold"
              style={{ color: tier.color }}
            >
              {tier.name}
            </div>
            <div className="text-xs text-muted-foreground">{tier.price}</div>
          </div>
          <div
            className="px-4 py-2 rounded-full text-[11px] font-bold"
            style={{
              background: `${tier.color}20`,
              color: tier.color,
              border: `1px solid ${tier.color}40`,
            }}
          >
            Active
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {tier.features.map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-xs">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
          {tier.locked.map((f) => (
            <div
              key={f}
              className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
            >
              <span>✕</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Quota meter (Gold/Silver members only) ────────────────────── */}
      {aiQuota && aiQuotaTotal > 0 && (
        <div className="mk2-card mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-sm">🤖 AI Calls This Month</div>
            <div
              className={`font-bold text-sm ${
                aiQuotaLeft === 0
                  ? "text-red-400"
                  : aiQuotaLeft <= 5
                    ? "text-orange-400"
                    : "text-green-500"
              }`}
            >
              {aiQuotaLeft} / {aiQuotaTotal} remaining
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((aiQuotaLeft / aiQuotaTotal) * 100)}%`,
                background:
                  aiQuotaLeft === 0
                    ? "hsl(0 84% 51%)"
                    : aiQuotaLeft <= 5
                      ? "hsl(20 100% 50%)"
                      : "hsl(142 72% 37%)",
              }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {aiQuotaUsed} used · resets{" "}
            {aiQuota.resetDate
              ? new Date(aiQuota.resetDate).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "long",
                })
              : "next month"}
          </div>
          {aiQuotaLeft === 0 && (
            <div className="mt-2 text-xs text-red-400">
              ⚠ All AI calls used for this month. Upgrade to Gold for 200
              calls/month or wait for the monthly reset.
            </div>
          )}
        </div>
      )}

      {/* ── Non-member AI notice ─────────────────────────────────────────── */}
      {currentTier === "basic" && (
        <div
          className="mk2-card mb-6"
          style={{
            border: "1px solid hsl(263 85% 58% / 0.3)",
            background: "hsl(263 85% 58% / 0.05)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-bold text-sm mb-1">AI Features Locked</div>
              <div className="text-xs text-muted-foreground">
                Upgrade to Silver or Gold to unlock AI Workout Planner, AI
                Nutrition Coach and InBody AI Analysis. Gold members get 200 AI
                calls per month.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan cards ───────────────────────────────────────────────────── */}
      <div className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-[0.08em] text-[10px]">
        Subscription Plans
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mb-6">
        {TIERS.map((t, i) => {
          const isCurrent = t.id === currentTier;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card rounded-xl p-5 flex flex-col"
              style={{
                border: isCurrent
                  ? `2px solid ${t.color}`
                  : "1px solid hsl(var(--border))",
              }}
            >
              <div
                className="font-display text-xl mb-0.5"
                style={{ color: t.color }}
              >
                {t.name}
              </div>
              <div className="font-bold text-lg mb-3">{t.price}</div>
              <div className="flex flex-col gap-1.5 mb-5 flex-1">
                {t.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs">
                    <span className="text-green-400">✓</span> {f}
                  </div>
                ))}
                {t.locked.map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
                  >
                    <span>✕</span> {f}
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div
                  className="text-center text-[11px] font-bold py-2.5 rounded-lg"
                  style={{ background: `${t.color}20`, color: t.color }}
                >
                  ✓ Your Current Plan
                </div>
              ) : t.priceNum === 0 ? (
                <div className="text-center text-[11px] text-muted-foreground py-2.5 rounded-lg border border-border">
                  Free — no payment needed
                </div>
              ) : (
                <a
                  href={subscriptionUrl(t, user.email, user.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-[12px] font-bold py-2.5 rounded-lg transition-all"
                  style={{
                    background: "hsl(20 100% 50%)",
                    color: "#000",
                    textDecoration: "none",
                  }}
                >
                  Upgrade to {t.name} — {t.price} →
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Gold auto-credit note ─────────────────────────────────────────── */}
      {currentTier === "gold" && (
        <div className="mk2-card border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-sm mb-1">Gold Monthly Credits</div>
              <div className="text-xs text-muted-foreground">
                You automatically receive 10 class credits on the 1st of each
                month. They reset monthly and do not roll over. Your AI quota
                (200 calls) also resets on the 1st.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { Btn } from "@/components/shared/Btn";
// import { motion } from "framer-motion";

// // ── Membership tiers ──────────────────────────────────────────────────────────
// const TIERS = [
//   {
//     id: "basic",
//     name: "Basic",
//     price: "Free",
//     color: "#9ca3af",
//     features: [
//       "Dashboard & check-in",
//       "Class schedule (view only)",
//       "Gallery & news",
//       "Membership info",
//     ],
//     locked: ["Leaderboard", "PR Logbook", "AI features", "InBody tracking"],
//   },
//   {
//     id: "silver",
//     name: "Silver",
//     price: "R199/mo",
//     color: "#e2e8f0",
//     features: [
//       "Everything in Basic",
//       "Class booking",
//       "Leaderboard",
//       "PR Logbook",
//       "Community feed",
//       "10% class discount",
//     ],
//     locked: ["AI Workout Planner", "AI Nutrition", "InBody tracking"],
//   },
//   {
//     id: "gold",
//     name: "Gold",
//     price: "R349/mo",
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
//   },
// ];

// export function Membership({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();

//   if (!user) return null;

//   const credits = (user as any).classCredits ?? 0;
//   const currentTier = (user as any).membership ?? "basic";
//   const tier = TIERS.find((t) => t.id === currentTier) ?? TIERS[0];

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Manage your gym membership and subscription">
//         Gym <span className="text-primary">Membership</span>
//       </PageTitle>

//       {/* Credit balance — simple, no purchase CTA */}
//       <div className="mk2-card mb-6 flex items-center justify-between gap-4">
//         <div>
//           <div className="font-bold text-base mb-0.5">Class Credits</div>
//           <div className="text-xs text-muted-foreground">
//             1 credit = 1 class booking · Contact reception to top up
//           </div>
//         </div>
//         <div className="text-right shrink-0">
//           <div className="font-display text-4xl text-primary">{credits}</div>
//           <div className="text-[11px] text-muted-foreground">available</div>
//         </div>
//       </div>

//       {/* Current plan */}
//       <div
//         className="mk2-card mb-6 border-l-4"
//         style={{ borderLeftColor: tier.color }}
//       >
//         <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
//           <div>
//             <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
//               Current Plan
//             </div>
//             <div
//               className="font-display text-2xl font-bold"
//               style={{ color: tier.color }}
//             >
//               {tier.name}
//             </div>
//             <div className="text-xs text-muted-foreground">{tier.price}</div>
//           </div>
//           <div
//             className="px-4 py-2 rounded-full text-[11px] font-bold"
//             style={{
//               background: `${tier.color}20`,
//               color: tier.color,
//               border: `1px solid ${tier.color}40`,
//             }}
//           >
//             Active
//           </div>
//         </div>
//         <div className="grid grid-cols-2 gap-1.5">
//           {tier.features.map((f) => (
//             <div key={f} className="flex items-center gap-1.5 text-xs">
//               <span className="text-green-400">✓</span>
//               {f}
//             </div>
//           ))}
//           {tier.locked.map((f) => (
//             <div
//               key={f}
//               className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
//             >
//               <span>✕</span>
//               {f}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Subscription / upgrade info */}
//       <div className="mk2-card mb-8 border border-primary/20 bg-primary/5">
//         <div className="flex items-start gap-3">
//           <span className="text-2xl mt-0.5">💳</span>
//           <div>
//             <div className="font-bold text-sm mb-1">
//               Want to upgrade your subscription?
//             </div>
//             <div className="text-xs text-muted-foreground leading-relaxed mb-3">
//               Visit reception or speak to one of our team members to upgrade
//               your plan, purchase class credit packs, or set up a debit order.
//               We'll get you sorted.
//             </div>
//             <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
//               <span className="flex items-center gap-1">📞 Reception desk</span>
//               <span className="flex items-center gap-1">
//                 🕐 Mon–Sat 05:00–21:00
//               </span>
//               <span className="flex items-center gap-1">
//                 🕐 Sun 07:00–13:00
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* All tiers — for reference / upgrade awareness */}
//       <div className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider text-[11px]">
//         Subscription Plans
//       </div>
//       <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
//         {TIERS.map((t, i) => {
//           const isCurrent = t.id === currentTier;
//           return (
//             <motion.div
//               key={t.id}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.07 }}
//               className="bg-card border rounded-xl p-5"
//               style={{
//                 borderColor: isCurrent ? t.color : "hsl(var(--border))",
//                 borderWidth: isCurrent ? 2 : 1,
//               }}
//             >
//               <div
//                 className="font-display text-xl mb-0.5"
//                 style={{ color: t.color }}
//               >
//                 {t.name}
//               </div>
//               <div className="font-bold text-lg mb-3">{t.price}</div>
//               <div className="flex flex-col gap-1.5 mb-4">
//                 {t.features.map((f) => (
//                   <div key={f} className="flex items-center gap-1.5 text-xs">
//                     <span className="text-green-400">✓</span>
//                     {f}
//                   </div>
//                 ))}
//               </div>
//               {isCurrent ? (
//                 <div
//                   className="text-center text-[11px] font-bold py-2 rounded-lg"
//                   style={{ background: `${t.color}20`, color: t.color }}
//                 >
//                   Your Current Plan
//                 </div>
//               ) : (
//                 <div className="text-center text-[11px] text-muted-foreground py-2 rounded-lg border border-border">
//                   Ask at reception to upgrade
//                 </div>
//               )}
//             </motion.div>
//           );
//         })}
//       </div>

//       {/* Gold auto-credit note */}
//       {currentTier === "gold" && (
//         <div className="mk2-card mt-6 border border-orange-500/30 bg-orange-500/5">
//           <div className="flex items-start gap-3">
//             <span className="text-2xl">🏆</span>
//             <div>
//               <div className="font-bold text-sm mb-1">Gold Monthly Credits</div>
//               <div className="text-xs text-muted-foreground">
//                 As a Gold member, you automatically receive 10 class credits at
//                 the start of each month. These reset on the 1st and do not roll
//                 over.
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { db } from "@/lib/firebase";
// import { ref, onValue } from "firebase/database";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { Btn } from "@/components/shared/Btn";
// import { motion } from "framer-motion";

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface Package {
//   id: string;
//   name: string;
//   description: string;
//   credits: number;
//   price: number; // ZAR
//   badge?: string;
//   active: boolean;
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const TIERS = [
//   {
//     id: "basic",
//     name: "Basic",
//     price: "Free",
//     color: "#9ca3af",
//     features: [
//       "Dashboard & check-in",
//       "Class schedule (view only)",
//       "Gallery & news",
//       "Membership info",
//     ],
//     locked: ["Leaderboard", "PR Logbook", "AI features", "InBody tracking"],
//   },
//   {
//     id: "silver",
//     name: "Silver",
//     price: "R199/mo",
//     color: "#e2e8f0",
//     features: [
//       "Everything in Basic",
//       "Class booking",
//       "Leaderboard",
//       "PR Logbook",
//       "Community feed",
//       "10% class discount",
//     ],
//     locked: ["AI Workout Planner", "AI Nutrition", "InBody tracking"],
//   },
//   {
//     id: "gold",
//     name: "Gold",
//     price: "R349/mo",
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
//   },
// ];

// function CreditBar({ credits }: { credits: number }) {
//   const max = 10;
//   const pct = Math.min(100, (credits / max) * 100);
//   return (
//     <div className="mk2-card mb-6">
//       <div className="flex items-center justify-between mb-2">
//         <div>
//           <div className="font-bold text-base">Class Credits</div>
//           <div className="text-xs text-muted-foreground">
//             1 credit = 1 class booking
//           </div>
//         </div>
//         <div className="text-right">
//           <div className="font-display text-3xl text-primary">{credits}</div>
//           <div className="text-[11px] text-muted-foreground">available</div>
//         </div>
//       </div>
//       <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
//         <motion.div
//           className="h-full rounded-full bg-orange-500"
//           initial={{ width: 0 }}
//           animate={{ width: `${pct}%` }}
//           transition={{ duration: 0.6, ease: "easeOut" }}
//         />
//       </div>
//       <div className="text-[10px] text-muted-foreground mt-1.5">
//         {credits === 0
//           ? "No credits — purchase a package below"
//           : `${credits} credit${credits !== 1 ? "s" : ""} remaining`}
//       </div>
//     </div>
//   );
// }

// export function Membership({ setPage }: { setPage: (p: string) => void }) {
//   const { user } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [packages, setPackages] = useState<Package[]>([]);
//   const [loadingPkgs, setLoadingPkgs] = useState(true);

//   useEffect(() => {
//     return onValue(ref(db, "packages"), (snap) => {
//       if (snap.exists()) {
//         const list = Object.entries(snap.val())
//           .map(([id, val]: [string, any]) => ({ id, ...val }))
//           .filter((p: any) => p.active !== false)
//           .sort((a: any, b: any) => a.price - b.price);
//         setPackages(list as Package[]);
//       } else {
//         setPackages([]);
//       }
//       setLoadingPkgs(false);
//     });
//   }, []);

//   if (!user) return null;

//   const credits = (user as any).classCredits ?? 0;
//   const currentTier = (user as any).membership ?? "basic";
//   const tier = TIERS.find((t) => t.id === currentTier) ?? TIERS[0];

//   const handlePurchase = (pkg: Package) => {
//     // PayFast integration point — for now shows info
//     alert(
//       `PayFast payment coming soon!\n\nPackage: ${pkg.name}\nCredits: ${pkg.credits}\nPrice: R${pkg.price}\n\nAsk your gym admin to assign credits manually in the meantime.`,
//     );
//   };

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Manage your membership and class credits">
//         Membership <span className="text-primary">&amp; Credits</span>
//       </PageTitle>

//       {/* Credit balance */}
//       <CreditBar credits={credits} />

//       {/* Current tier */}
//       <div
//         className="mk2-card mb-6 border-l-4"
//         style={{ borderLeftColor: tier.color }}
//       >
//         <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
//           <div>
//             <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
//               Current Plan
//             </div>
//             <div
//               className="font-display text-2xl font-bold"
//               style={{ color: tier.color }}
//             >
//               {tier.name}
//             </div>
//             <div className="text-xs text-muted-foreground">{tier.price}</div>
//           </div>
//           <div
//             className="px-4 py-2 rounded-full text-[11px] font-bold"
//             style={{
//               background: `${tier.color}20`,
//               color: tier.color,
//               border: `1px solid ${tier.color}40`,
//             }}
//           >
//             Active
//           </div>
//         </div>
//         <div className="grid grid-cols-2 gap-1.5">
//           {tier.features.map((f) => (
//             <div key={f} className="flex items-center gap-1.5 text-xs">
//               <span className="text-green-400">✓</span>
//               {f}
//             </div>
//           ))}
//           {tier.locked.map((f) => (
//             <div
//               key={f}
//               className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
//             >
//               <span>✕</span>
//               {f}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Membership tiers */}
//       <div className="font-bold text-sm mb-3">Upgrade Your Plan</div>
//       <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mb-8">
//         {TIERS.map((t, i) => {
//           const isCurrent = t.id === currentTier;
//           return (
//             <motion.div
//               key={t.id}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.07 }}
//               className="bg-card border rounded-xl p-5"
//               style={{
//                 borderColor: isCurrent ? t.color : "hsl(var(--border))",
//                 borderWidth: isCurrent ? 2 : 1,
//               }}
//             >
//               <div
//                 className="font-display text-xl mb-0.5"
//                 style={{ color: t.color }}
//               >
//                 {t.name}
//               </div>
//               <div className="font-bold text-lg mb-3">{t.price}</div>
//               <div className="flex flex-col gap-1.5 mb-4">
//                 {t.features.map((f) => (
//                   <div key={f} className="flex items-center gap-1.5 text-xs">
//                     <span className="text-green-400">✓</span>
//                     {f}
//                   </div>
//                 ))}
//               </div>
//               {isCurrent ? (
//                 <div
//                   className="text-center text-[11px] font-bold py-2 rounded-lg"
//                   style={{ background: `${t.color}20`, color: t.color }}
//                 >
//                   Current Plan
//                 </div>
//               ) : (
//                 <Btn
//                   variant="primary"
//                   size="sm"
//                   onClick={() =>
//                     alert(
//                       "Contact your gym admin or use PayFast (coming soon) to upgrade.",
//                     )
//                   }
//                 >
//                   Upgrade to {t.name} →
//                 </Btn>
//               )}
//             </motion.div>
//           );
//         })}
//       </div>

//       {/* Class credit packages */}
//       <div className="font-bold text-sm mb-1">Class Credit Packages</div>
//       <div className="text-xs text-muted-foreground mb-4">
//         Each credit = 1 class booking. Gold members receive 10 free credits per
//         month automatically.
//       </div>

//       {loadingPkgs ? (
//         <div className="text-sm text-muted-foreground py-6">
//           Loading packages…
//         </div>
//       ) : packages.length === 0 ? (
//         <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
//           No packages available yet. Check back soon.
//         </div>
//       ) : (
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
//           {packages.map((pkg, i) => (
//             <motion.div
//               key={pkg.id}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.07 }}
//               className="bg-card border border-border rounded-xl p-5 flex flex-col"
//             >
//               {pkg.badge && (
//                 <div className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-3">
//                   {pkg.badge}
//                 </div>
//               )}
//               <div className="font-bold text-base mb-1">{pkg.name}</div>
//               <div className="text-xs text-muted-foreground mb-3">
//                 {pkg.description}
//               </div>
//               <div className="flex items-end gap-2 mb-4">
//                 <div className="font-display text-3xl text-primary">
//                   {pkg.credits}
//                 </div>
//                 <div className="text-xs text-muted-foreground mb-1">
//                   credits
//                 </div>
//               </div>
//               <div className="font-bold text-lg mb-4">R{pkg.price}</div>
//               <Btn
//                 variant="primary"
//                 size="sm"
//                 onClick={() => handlePurchase(pkg)}
//               >
//                 Purchase →
//               </Btn>
//             </motion.div>
//           ))}
//         </div>
//       )}

//       {/* Gold auto-credit note */}
//       {currentTier === "gold" && (
//         <div className="mk2-card mt-6 border border-orange-500/30 bg-orange-500/5">
//           <div className="flex items-start gap-3">
//             <span className="text-2xl">🏆</span>
//             <div>
//               <div className="font-bold text-sm mb-1">Gold Monthly Credits</div>
//               <div className="text-xs text-muted-foreground">
//                 As a Gold member, you automatically receive 10 class credits at
//                 the start of each month. These reset on the 1st and do not roll
//                 over.
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
