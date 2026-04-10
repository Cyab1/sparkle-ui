import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";

// ── Cloud Function ────────────────────────────────────────────────────────────
const aiChatFn = httpsCallable(getFunctions(), "aiChat");

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function NutritionCoach() {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  const [cal, setCal] = useState("2200");
  const [blood, setBlood] = useState("O+");
  const [diet, setDiet] = useState("No restrictions");
  const [plan, setPlan] = useState("Full Day Meal Plan");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [aiError, setAiError] = useState("");

  if (!user) return null;

  const membership = (user as any).membership ?? "basic";
  const isActiveMember = membership === "silver" || membership === "gold";
  const aiQuota = (user as any).aiQuota ?? null;

  const remaining =
    quotaRemaining !== null ? quotaRemaining : (aiQuota?.remaining ?? 0);
  const quotaTotal =
    membership === "gold" ? 200 : membership === "silver" ? 50 : 0;
  const outOfCredits = remaining <= 0;

  // ── Non-member gate ───────────────────────────────────────────────────────
  if (!isActiveMember) {
    return (
      <div
        className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
      >
        <PageTitle sub="Science-backed meal plans tailored to your goals">
          AI Nutrition <span className="text-primary">Coach</span>
        </PageTitle>
        <div className="mk2-card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="text-5xl">🔒</span>
          <div className="font-bold text-lg">Members Only</div>
          <div className="text-sm text-muted-foreground max-w-xs">
            AI Nutrition Coaching is available on Silver and Gold plans. Upgrade
            your membership to unlock personalised meal plans.
          </div>
          <Btn variant="primary" onClick={() => {}}>
            View Plans →
          </Btn>
        </div>
      </div>
    );
  }

  const generate = async () => {
    if (outOfCredits) {
      toast("Monthly AI limit reached. Resets on the 1st.", "error");
      return;
    }

    setLoading(true);
    setResult("");
    setAiError("");
    logEvent("generate_nutrition", { calories: cal, blood, plan });

    try {
      const prompt = `${plan} for: Goal: ${user.goal} | Level: ${user.level} | Calories: ${cal}/day | Blood type: ${blood} | Diet: ${diet}. Include SA ingredients. Show protein/carbs/fat.`;

      const res = await aiChatFn({
        prompt,
        systemPrompt:
          "You are a certified sports nutritionist at MK2 Rivers Fitness, South Africa. Create practical meal plans with exact portions, SA food options, and macros per meal plus daily totals. Consider the user's blood type for optimal food choices when relevant.",
        mode: "nutrition",
      });
      const data = res.data as { response: string; quotaRemaining: number };
      setResult(data.response);
      setQuotaRemaining(data.quotaRemaining);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("QUOTA_EXCEEDED")) {
        setAiError(
          "You've used all your AI calls for this month. Your quota resets on the 1st.",
        );
        setQuotaRemaining(0);
      } else if (msg.includes("JOIN_GYM")) {
        setAiError("An active membership is required to use AI features.");
      } else {
        setAiError("Generation failed. Please try again.");
        toast("Generation failed", "error");
      }
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
        {/* ── AI quota counter ───────────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${
            outOfCredits
              ? "bg-red-500/10 border border-red-500/30"
              : "bg-secondary"
          }`}
        >
          <div className="text-xs text-muted-foreground">
            AI calls this month
          </div>
          <div
            className={`font-bold text-sm ${
              outOfCredits
                ? "text-red-400"
                : remaining <= 5
                  ? "text-orange-400"
                  : "text-green-500"
            }`}
          >
            {remaining} / {quotaTotal} remaining
            {outOfCredits && " — resets on the 1st"}
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
              ? "No AI Calls Left"
              : "Generate Meal Plan"}
        </Btn>

        {aiError && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {aiError}
          </div>
        )}

        {result && <div className="mk2-ai-box mt-4">{result}</div>}
      </div>
    </div>
  );
}
