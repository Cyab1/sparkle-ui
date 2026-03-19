import React from "react";
import { useAuth } from "@/context/AuthContext";

export type Tier = "basic" | "silver" | "gold";

const TIER_RANK: Record<Tier, number> = { basic: 0, silver: 1, gold: 2 };

const TIER_STYLE: Record<
  Tier,
  { color: string; bg: string; border: string; label: string; price: string }
> = {
  basic: {
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.1)",
    border: "rgba(156,163,175,0.25)",
    label: "Basic",
    price: "Free",
  },
  silver: {
    color: "#e2e8f0",
    bg: "rgba(226,232,240,0.1)",
    border: "rgba(226,232,240,0.3)",
    label: "Silver",
    price: "R19/mo",
  },
  gold: {
    color: "hsl(38 92% 50%)",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    label: "Gold",
    price: "R49/mo",
  },
};

const TIER_FEATURES: Record<Tier, string[]> = {
  basic: ["Dashboard", "Classes", "Check-In", "Gallery", "News"],
  silver: [
    "Everything in Basic",
    "Community Chat",
    "Leaderboard",
    "Push Notifications",
  ],
  gold: [
    "Everything in Silver",
    "AI Workout Planner",
    "Nutrition & Meal Plans",
    "BMR Calculator",
    "InBody Analysis",
    "Progress Tracker",
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
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: "25vh",
          height: "26vh",
          background: "linear-gradient(to bottom, transparent, #070707)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 pb-20 pt-8">
        <div
          className="w-full max-w-sm rounded-2xl p-6"
          style={{
            background: "rgba(12,12,12,0.95)",
            border: `1px solid ${style.border}`,
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
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
              <p
                className="text-xs font-body mt-0.5"
                style={{ color: style.color }}
              >
                Upgrade to {style.label} to unlock
              </p>
            </div>
          </div>
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
          <div
            className="text-center text-xs font-body mb-4 py-2 rounded-lg"
            style={{
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
            }}
          >
            <span className="font-bold">{style.label}</span> · {style.price}
            {required === "silver" && "  or R199/yr"}
            {required === "gold" && "  or R499/yr"}
          </div>
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

// import { ReactNode } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { motion } from "framer-motion";

// type Tier = "basic" | "silver" | "gold";

// const TIER_RANK: Record<Tier, number> = { basic: 0, silver: 1, gold: 2 };

// const TIER_COLOUR: Record<Tier, string> = {
//   basic: "hsl(217 91% 53%)",
//   silver: "hsl(220 14% 70%)",
//   gold: "hsl(38 92% 50%)",
// };

// const TIER_PRICE: Record<Tier, string> = {
//   basic: "Free",
//   silver: "R19/mo or R199/yr",
//   gold: "R49/mo or R499/yr",
// };

// interface MembershipGateProps {
//   required: Tier;
//   page: string;
//   icon?: string;
//   children: ReactNode;
//   setPage?: (p: string) => void;
// }

// export function MembershipGate({
//   required,
//   page,
//   icon = "⚡",
//   children,
//   setPage,
// }: MembershipGateProps) {
//   const { user } = useAuth();
//   const userTier = ((user as any)?.membership ?? "basic") as Tier;
//   const hasAccess = TIER_RANK[userTier] >= TIER_RANK[required];

//   if (hasAccess) return <>{children}</>;

//   const color = TIER_COLOUR[required];
//   const price = TIER_PRICE[required];

//   return (
//     <div className="relative min-h-screen overflow-hidden">
//       <div
//         className="pointer-events-none select-none"
//         style={{
//           filter: "blur(5px) brightness(0.3)",
//           maxHeight: "58vh",
//           overflow: "hidden",
//         }}
//         aria-hidden="true"
//       >
//         {children}
//       </div>

//       <div
//         className="absolute inset-x-0 pointer-events-none"
//         style={{
//           top: "28vh",
//           height: "30vh",
//           background: "linear-gradient(to bottom, transparent, #070707)",
//         }}
//       />

//       <div className="absolute inset-0 flex flex-col items-center justify-center px-5 pb-20 pt-6">
//         <motion.div
//           initial={{ opacity: 0, y: 16 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//           className="w-full max-w-sm rounded-2xl p-6"
//           style={{
//             background: "rgba(10,10,10,0.95)",
//             border: `1px solid ${color}40`,
//             backdropFilter: "blur(20px)",
//           }}
//         >
//           <div className="flex items-center gap-3 mb-4">
//             <div
//               className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
//               style={{
//                 background: `${color}18`,
//                 border: `1px solid ${color}40`,
//               }}
//             >
//               {icon}
//             </div>
//             <div>
//               <div className="text-white font-display text-lg leading-tight">
//                 {page}
//               </div>
//               <div className="text-[11px] font-bold mt-0.5" style={{ color }}>
//                 {required.charAt(0).toUpperCase() + required.slice(1)}{" "}
//                 membership required
//               </div>
//             </div>
//           </div>

//           <p className="text-sm text-white/50 mb-4 leading-relaxed">
//             Upgrade to{" "}
//             <span className="font-bold" style={{ color }}>
//               {required.charAt(0).toUpperCase() + required.slice(1)}
//             </span>{" "}
//             to unlock <span className="text-white">{page}</span> and everything
//             else at that tier.
//           </p>

//           <div
//             className="rounded-xl px-4 py-3 mb-5 flex items-center justify-between"
//             style={{ background: `${color}10`, border: `1px solid ${color}30` }}
//           >
//             <div>
//               <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
//                 {required.charAt(0).toUpperCase() + required.slice(1)} plan
//               </div>
//               <div className="font-display text-xl" style={{ color }}>
//                 {price}
//               </div>
//             </div>
//             <div className="text-2xl">
//               {required === "silver" ? "🥈" : "🥇"}
//             </div>
//           </div>

//           <button
//             onClick={() => setPage?.("Membership")}
//             className="w-full py-3 rounded-xl font-body font-bold text-sm uppercase tracking-wide border-none cursor-pointer mb-2.5 transition-all active:scale-95"
//             style={{ background: color, color: "#000" }}
//           >
//             Upgrade to {required.charAt(0).toUpperCase() + required.slice(1)} →
//           </button>
//           <button
//             onClick={() => setPage?.("Membership")}
//             className="w-full py-2.5 rounded-xl font-body text-xs text-white/30 bg-transparent border-none cursor-pointer hover:text-white/60 transition-colors"
//           >
//             View all plans
//           </button>
//         </motion.div>
//       </div>
//     </div>
//   );
// }
