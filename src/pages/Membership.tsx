import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { PageTitle } from "@/components/shared/PageTitle";
import { Btn } from "@/components/shared/Btn";
import { motion } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Package {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number; // ZAR
  badge?: string;
  active: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    color: "#9ca3af",
    features: [
      "Dashboard & check-in",
      "Class schedule (view only)",
      "Gallery & news",
      "Membership info",
    ],
    locked: ["Leaderboard", "PR Logbook", "AI features", "InBody tracking"],
  },
  {
    id: "silver",
    name: "Silver",
    price: "R199/mo",
    color: "#e2e8f0",
    features: [
      "Everything in Basic",
      "Class booking",
      "Leaderboard",
      "PR Logbook",
      "Community feed",
      "10% class discount",
    ],
    locked: ["AI Workout Planner", "AI Nutrition", "InBody tracking"],
  },
  {
    id: "gold",
    name: "Gold",
    price: "R349/mo",
    color: "hsl(38 92% 50%)",
    features: [
      "Everything in Silver",
      "AI Workout Planner",
      "AI Nutrition Coach",
      "InBody Assessments",
      "Progress Reports",
      "20% class discount",
      "10 free class credits/month",
    ],
    locked: [],
  },
];

function CreditBar({ credits }: { credits: number }) {
  const max = 10;
  const pct = Math.min(100, (credits / max) * 100);
  return (
    <div className="mk2-card mb-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-bold text-base">Class Credits</div>
          <div className="text-xs text-muted-foreground">
            1 credit = 1 class booking
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-primary">{credits}</div>
          <div className="text-[11px] text-muted-foreground">available</div>
        </div>
      </div>
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5">
        {credits === 0
          ? "No credits — purchase a package below"
          : `${credits} credit${credits !== 1 ? "s" : ""} remaining`}
      </div>
    </div>
  );
}

export function Membership({ setPage }: { setPage: (p: string) => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  useEffect(() => {
    return onValue(ref(db, "packages"), (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter((p: any) => p.active !== false)
          .sort((a: any, b: any) => a.price - b.price);
        setPackages(list as Package[]);
      } else {
        setPackages([]);
      }
      setLoadingPkgs(false);
    });
  }, []);

  if (!user) return null;

  const credits = (user as any).classCredits ?? 0;
  const currentTier = (user as any).membership ?? "basic";
  const tier = TIERS.find((t) => t.id === currentTier) ?? TIERS[0];

  const handlePurchase = (pkg: Package) => {
    // PayFast integration point — for now shows info
    alert(
      `PayFast payment coming soon!\n\nPackage: ${pkg.name}\nCredits: ${pkg.credits}\nPrice: R${pkg.price}\n\nAsk your gym admin to assign credits manually in the meantime.`,
    );
  };

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Manage your membership and class credits">
        Membership <span className="text-primary">&amp; Credits</span>
      </PageTitle>

      {/* Credit balance */}
      <CreditBar credits={credits} />

      {/* Current tier */}
      <div
        className="mk2-card mb-6 border-l-4"
        style={{ borderLeftColor: tier.color }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
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
              <span className="text-green-400">✓</span>
              {f}
            </div>
          ))}
          {tier.locked.map((f) => (
            <div
              key={f}
              className="flex items-center gap-1.5 text-xs text-muted-foreground line-through"
            >
              <span>✕</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Membership tiers */}
      <div className="font-bold text-sm mb-3">Upgrade Your Plan</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mb-8">
        {TIERS.map((t, i) => {
          const isCurrent = t.id === currentTier;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border rounded-xl p-5"
              style={{
                borderColor: isCurrent ? t.color : "hsl(var(--border))",
                borderWidth: isCurrent ? 2 : 1,
              }}
            >
              <div
                className="font-display text-xl mb-0.5"
                style={{ color: t.color }}
              >
                {t.name}
              </div>
              <div className="font-bold text-lg mb-3">{t.price}</div>
              <div className="flex flex-col gap-1.5 mb-4">
                {t.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs">
                    <span className="text-green-400">✓</span>
                    {f}
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <div
                  className="text-center text-[11px] font-bold py-2 rounded-lg"
                  style={{ background: `${t.color}20`, color: t.color }}
                >
                  Current Plan
                </div>
              ) : (
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    alert(
                      "Contact your gym admin or use PayFast (coming soon) to upgrade.",
                    )
                  }
                >
                  Upgrade to {t.name} →
                </Btn>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Class credit packages */}
      <div className="font-bold text-sm mb-1">Class Credit Packages</div>
      <div className="text-xs text-muted-foreground mb-4">
        Each credit = 1 class booking. Gold members receive 10 free credits per
        month automatically.
      </div>

      {loadingPkgs ? (
        <div className="text-sm text-muted-foreground py-6">
          Loading packages…
        </div>
      ) : packages.length === 0 ? (
        <div className="mk2-card text-center py-10 text-muted-foreground text-sm">
          No packages available yet. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-xl p-5 flex flex-col"
            >
              {pkg.badge && (
                <div className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-3">
                  {pkg.badge}
                </div>
              )}
              <div className="font-bold text-base mb-1">{pkg.name}</div>
              <div className="text-xs text-muted-foreground mb-3">
                {pkg.description}
              </div>
              <div className="flex items-end gap-2 mb-4">
                <div className="font-display text-3xl text-primary">
                  {pkg.credits}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  credits
                </div>
              </div>
              <div className="font-bold text-lg mb-4">R{pkg.price}</div>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => handlePurchase(pkg)}
              >
                Purchase →
              </Btn>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gold auto-credit note */}
      {currentTier === "gold" && (
        <div className="mk2-card mt-6 border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-bold text-sm mb-1">Gold Monthly Credits</div>
              <div className="text-xs text-muted-foreground">
                As a Gold member, you automatically receive 10 class credits at
                the start of each month. These reset on the 1st and do not roll
                over.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
