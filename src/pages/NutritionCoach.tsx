import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { askClaude } from "@/services/api";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";

export function NutritionCoach() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [cal, setCal] = useState("2200");
  const [diet, setDiet] = useState("No restrictions");
  const [plan, setPlan] = useState("Full Day Meal Plan");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const generate = async () => {
    setLoading(true);
    setResult("");
    logEvent("generate_nutrition", { calories: cal, plan });
    await askClaude(
      `You are a certified sports nutritionist at MK2 Rivers Fitness, South Africa. Create practical meal plans with exact portions, SA food options, and macros per meal plus daily totals.`,
      `${plan} for: Goal: ${user.goal} | Level: ${user.level} | Calories: ${cal}/day | Diet: ${diet}. Include SA ingredients. Show protein/carbs/fat.`,
      setResult
    );
    setLoading(false);
  };

  const fields = [
    { label: "Calories/day", val: cal, set: setCal, opts: ["1400", "1600", "1800", "2000", "2200", "2500", "3000", "3500"] },
    { label: "Diet Preference", val: diet, set: setDiet, opts: ["No restrictions", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Dairy-free", "High Protein"] },
    { label: "Plan Type", val: plan, set: setPlan, opts: ["Full Day Meal Plan", "Pre-Workout Meal", "Post-Workout Recovery", "Meal Prep Guide", "High Protein Day", "Cutting Phase", "Bulking Phase"] },
  ];

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Science-backed meal plans tailored to your goals">
        AI Nutrition <span className="text-primary">Coach</span>
      </PageTitle>

      <div className="mk2-card">
        <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {fields.map((f) => (
            <div key={f.label}>
              <label className="mk2-label">{f.label}</label>
              <select className="mk2-select" value={f.val} onChange={(e) => f.set(e.target.value)}>
                {f.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={generate} disabled={loading}>
          🥗 {loading ? "Building plan…" : "Generate Meal Plan"}
        </Btn>
        {result && <div className="mk2-ai-box">{result}</div>}
      </div>
    </div>
  );
}
