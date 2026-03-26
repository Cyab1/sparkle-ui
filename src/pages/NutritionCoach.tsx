import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { askClaude } from "@/services/api";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";

// ── Shared credit cap (same as AI Workout Planner) ───────────────────────────
const MONTHLY_CREDIT_LIMIT = 10;

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const getCreditsUsed = (user: any): number => {
  const key = currentMonthKey();
  return user?.aiCredits?.[key] ?? 0;
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function NutritionCoach() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [cal, setCal] = useState("2200");
  const [blood, setBlood] = useState("O+");
  const [diet, setDiet] = useState("No restrictions");
  const [plan, setPlan] = useState("Full Day Meal Plan");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const creditsUsed = getCreditsUsed(user);
  const creditsLeft = MONTHLY_CREDIT_LIMIT - creditsUsed;
  const outOfCredits = creditsLeft <= 0;

  const generate = async () => {
    if (outOfCredits) {
      toast(
        `Monthly limit reached (${MONTHLY_CREDIT_LIMIT} plans). Resets next month.`,
        "error",
      );
      return;
    }

    setLoading(true);
    setResult("");
    logEvent("generate_nutrition", { calories: cal, blood, plan });

    // Deduct credit immediately
    const key = currentMonthKey();
    const newCredits = {
      ...(user.aiCredits || {}),
      [key]: creditsUsed + 1,
    };
    await updateUser({ ...user, aiCredits: newCredits } as any);

    try {
      const prompt = `${plan} for: Goal: ${user.goal} | Level: ${user.level} | Calories: ${cal}/day | Blood type: ${blood} | Diet: ${diet}. Include SA ingredients. Show protein/carbs/fat.`;

      await askClaude(
        `You are a certified sports nutritionist at MK2 Rivers Fitness, South Africa. Create practical meal plans with exact portions, SA food options, and macros per meal plus daily totals. Consider the user's blood type for optimal food choices when relevant.`,
        prompt,
        setResult,
      );
    } catch (error) {
      // Refund credit if generation fails
      const refundCredits = { ...user.aiCredits, [key]: creditsUsed };
      await updateUser({ ...user, aiCredits: refundCredits } as any);
      toast("Generation failed – credit refunded", "error");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: "Calories/day",
      val: cal,
      set: setCal,
      opts: ["1400", "1600", "1800", "2000", "2200", "2500", "3000", "3500"],
    },
    { label: "Blood Type", val: blood, set: setBlood, opts: BLOOD_TYPES },
    {
      label: "Diet Preference",
      val: diet,
      set: setDiet,
      opts: [
        "No restrictions",
        "Vegetarian",
        "Vegan",
        "Halal",
        "Kosher",
        "Gluten-free",
        "Dairy-free",
        "High Protein",
      ],
    },
    {
      label: "Plan Type",
      val: plan,
      set: setPlan,
      opts: [
        "Full Day Meal Plan",
        "Pre-Workout Meal",
        "Post-Workout Recovery",
        "Meal Prep Guide",
        "High Protein Day",
        "Cutting Phase",
        "Bulking Phase",
      ],
    },
  ];

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Science-backed meal plans tailored to your goals">
        AI Nutrition <span className="text-primary">Coach</span>
      </PageTitle>

      <div className="mk2-card">
        {/* ── Credit counter ─────────────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${
            outOfCredits
              ? "bg-red-500/10 border border-red-500/30"
              : "bg-secondary"
          }`}
        >
          <div className="text-xs text-muted-foreground">
            AI Plans this month
          </div>
          <div
            className={`font-bold text-sm ${
              outOfCredits
                ? "text-red-400"
                : creditsLeft <= 3
                  ? "text-orange-400"
                  : "text-green-500"
            }`}
          >
            {creditsUsed} / {MONTHLY_CREDIT_LIMIT} used
            {outOfCredits && " — resets next month"}
          </div>
        </div>

        <div
          className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {fields.map((f) => (
            <div key={f.label}>
              <label className="mk2-label">{f.label}</label>
              <select
                className="mk2-select"
                value={f.val}
                onChange={(e) => f.set(e.target.value)}
              >
                {f.opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <Btn
          variant="primary"
          onClick={generate}
          disabled={loading || outOfCredits}
        >
          🥗{" "}
          {loading
            ? "Building plan…"
            : outOfCredits
              ? "No Credits Left"
              : "Generate Meal Plan"}
        </Btn>

        {result && <div className="mk2-ai-box mt-4">{result}</div>}
      </div>
    </div>
  );
}
