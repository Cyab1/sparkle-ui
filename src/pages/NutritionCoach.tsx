import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { logEvent } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";

// ── Cloud Function ────────────────────────────────────────────────────────────
// Explicitly set europe-west1 to match the deployed function region.
// Do NOT use getFunctions() without a region — it defaults to us-central1
// and the call will silently fail with a generic "internal" error.
const aiChatFn = httpsCallable(
  getFunctions(undefined, "europe-west1"),
  "aiChat",
  { timeout: 60_000 }, // 60 s — AI responses can be slow
);

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CAL_OPTIONS = [
  "1400",
  "1600",
  "1800",
  "2000",
  "2200",
  "2500",
  "3000",
  "3500",
];

const DIET_OPTIONS = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Dairy-free",
  "High Protein",
];

// ── Parse calories from pasted BMR text ──────────────────────────────────────
function extractCaloriesFromBMR(text: string): string | null {
  const patterns = [
    /(?:tdee|maintenance|total daily|calories?)[^\d]*(\d[\d,]+)/i,
    /(\d[\d,]+)\s*(?:calories?|kcal)/i,
    /(?:goal|target)[^\d]*(\d[\d,]+)/i,
    /(\d{3,4}(?:,\d{3})?)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 1000 && num <= 6000) return String(num);
    }
  }
  return null;
}

export function NutritionCoach() {
  const { user, toast } = useAuth();
  const { isMobile } = useBreakpoint();

  const [bmrPaste, setBmrPaste] = useState("");
  const [cal, setCal] = useState("2200");
  const [blood, setBlood] = useState("O+");
  const [diet, setDiet] = useState("No restrictions");
  const [plan, setPlan] = useState("Lose Weight");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [aiError, setAiError] = useState("");
  const [bmrApplied, setBmrApplied] = useState(false);

  if (!user) return null;

  const membership = (user as any).membership ?? "basic";
  const isActiveMember = membership === "silver" || membership === "gold";
  const aiQuota = (user as any).aiQuota ?? null;

  const quotaTotal =
    membership === "gold" ? 100 : membership === "silver" ? 20 : 0;
  const used = aiQuota?.used ?? 0;
  const remaining =
    quotaRemaining !== null ? quotaRemaining : Math.max(0, quotaTotal - used);
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

  // ── BMR paste handler ─────────────────────────────────────────────────────
  const handleBmrPaste = useCallback(
    (text: string) => {
      setBmrPaste(text);
      setBmrApplied(false);
      if (text.trim()) {
        const extracted = extractCaloriesFromBMR(text);
        if (extracted) {
          setCal(extracted);
          setBmrApplied(true);
          toast(
            `✓ Calories set to ${extracted} from your BMR results`,
            "success",
          );
        }
      }
    },
    [toast],
  );

  // ── Generate ──────────────────────────────────────────────────────────────
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
      const bmrContext = bmrPaste.trim()
        ? ` BMR/TDEE context from user: "${bmrPaste.trim().substring(0, 300)}".`
        : "";

      const prompt = `${plan} for: Goal: ${user.goal} | Level: ${user.level} | Calories: ${cal}/day | Blood type: ${blood} | Diet: ${diet}.${bmrContext} Include SA ingredients. Show protein/carbs/fat.`;

      const res = await aiChatFn({
        prompt,
        systemPrompt:
          "You are a certified sports nutritionist at MK2 Rivers Fitness, South Africa. Create practical meal plans with exact portions, SA food options, and macros per meal plus daily totals. Consider the user's blood type for optimal food choices when relevant.",
        mode: "nutrition",
      });

      const data = res.data as { response: string; quotaRemaining: number };

      // Guard: ensure the function returned what we expect
      if (!data?.response) throw new Error("EMPTY_RESPONSE");

      setResult(data.response);
      setQuotaRemaining(data.quotaRemaining ?? null);
    } catch (err: any) {
      const msg: string = err?.message ?? "";

      // Only log in dev to avoid leaking details in production
      if (import.meta.env.DEV) {
        console.error("aiChat error:", err);
      }

      if (msg.includes("QUOTA_EXCEEDED")) {
        setAiError(
          "You've used all your AI calls for this month. Your quota resets on the 1st.",
        );
        setQuotaRemaining(0);
      } else if (msg.includes("JOIN_GYM")) {
        setAiError("An active membership is required to use AI features.");
      } else if (msg.includes("EMPTY_RESPONSE")) {
        setAiError("The AI returned an empty response. Please try again.");
        toast("Empty response from AI", "error");
      } else {
        setAiError("Generation failed. Please try again.");
        toast("Generation failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "Blood Type", val: blood, set: setBlood, opts: BLOOD_TYPES },
    { label: "Diet Preference", val: diet, set: setDiet, opts: DIET_OPTIONS },
    {
      label: "Plan Type",
      val: plan,
      set: setPlan,
      opts: ["Lose Weight", "Muscle Gain"],
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Science-backed meal plans tailored to your goals">
        AI Nutrition <span className="text-primary">Coach</span>
      </PageTitle>

      <div className="mk2-card">
        {/* ── AI quota counter ─────────────────────────────────────────── */}
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

        {/* ── BMR paste field ──────────────────────────────────────────── */}
        <div
          className="mb-4 rounded-xl p-4"
          style={{
            background: "hsl(20 100% 50% / 0.05)",
            border: "1px solid hsl(20 100% 50% / 0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              📋 Paste BMR / TDEE Results
            </label>
            {bmrApplied && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "hsl(142 72% 37% / 0.15)",
                  color: "hsl(142 72% 37%)",
                }}
              >
                ✓ Calories auto-filled
              </span>
            )}
          </div>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors font-body resize-none"
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
              minHeight: 80,
            }}
            placeholder={`Paste your BMR calculator results here — your calorie target will be filled in automatically.\n\ne.g. BMR: 1,820 kcal · TDEE: 2,450 kcal · Goal: 2,200 kcal`}
            value={bmrPaste}
            onChange={(e) => handleBmrPaste(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Copy results from the BMR Calculator tool and paste above — your
            calories will be pre-filled automatically.
          </p>
        </div>

        {/* ── Calories selector ────────────────────────────────────────── */}
        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
            Calories / day
            {bmrApplied && (
              <span
                className="ml-2 normal-case tracking-normal font-normal"
                style={{ color: "hsl(142 72% 37%)" }}
              >
                (from your BMR results)
              </span>
            )}
          </label>
          <div className="flex gap-2 flex-wrap">
            {CAL_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCal(c);
                  setBmrApplied(false);
                }}
                className="px-3 py-2 rounded-lg font-bold text-xs cursor-pointer transition-all"
                style={{
                  background:
                    cal === c ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
                  color: cal === c ? "#000" : "hsl(var(--foreground))",
                  border: `1px solid ${cal === c ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
                }}
              >
                {c}
              </button>
            ))}
            {/* Show custom value pill when BMR auto-filled a non-preset number */}
            {!CAL_OPTIONS.includes(cal) && (
              <button
                className="px-3 py-2 rounded-lg font-bold text-xs cursor-pointer"
                style={{ background: "hsl(20 100% 50%)", color: "#000" }}
              >
                {cal} ✓
              </button>
            )}
          </div>
        </div>

        {/* ── Blood type / Diet / Plan dropdowns ───────────────────────── */}
        <div
          className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
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

        {/* ── Generate button ───────────────────────────────────────────── */}
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

        {/* ── Error message ─────────────────────────────────────────────── */}
        {aiError && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {aiError}
          </div>
        )}

        {/* ── AI result ─────────────────────────────────────────────────── */}
        {result && (
          <div className="mk2-ai-box mt-4 whitespace-pre-wrap">{result}</div>
        )}
      </div>
    </div>
  );
}

// import { useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { logEvent } from "@/lib/firebase";
// import {
//   getFunctions,
//   httpsCallable,
//   connectFunctionsEmulator,
// } from "firebase/functions";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";

// // ── Cloud Function ────────────────────────────────────────────────────────────
// const functions = getFunctions(undefined, "europe-west1");

// // if (window.location.hostname === "localhost") {
// //   connectFunctionsEmulator(functions, "localhost", 5001);
// // }

// const aiChatFn = httpsCallable(functions, "aiChat");

// const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// // ── Parse calories from pasted BMR text ──────────────────────────────────────
// function extractCaloriesFromBMR(text: string): string | null {
//   const patterns = [
//     /(?:tdee|maintenance|total daily|calories?)[^\d]*(\d[\d,]+)/i,
//     /(\d[\d,]+)\s*(?:calories?|kcal)/i,
//     /(?:goal|target)[^\d]*(\d[\d,]+)/i,
//     /(\d{3,4}(?:,\d{3})?)/,
//   ];
//   for (const pattern of patterns) {
//     const match = text.match(pattern);
//     if (match) {
//       const num = parseInt(match[1].replace(/,/g, ""), 10);
//       if (num >= 1000 && num <= 6000) return String(num);
//     }
//   }
//   return null;
// }

// export function NutritionCoach() {
//   const { user, toast } = useAuth();
//   const { isMobile } = useBreakpoint();

//   const [bmrPaste, setBmrPaste] = useState("");
//   const [cal, setCal] = useState("2200");
//   const [blood, setBlood] = useState("O+");
//   const [diet, setDiet] = useState("No restrictions");
//   const [plan, setPlan] = useState("Lose Weight");
//   const [result, setResult] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
//   const [aiError, setAiError] = useState("");
//   const [bmrApplied, setBmrApplied] = useState(false);

//   if (!user) return null;

//   const membership = (user as any).membership ?? "basic";
//   const isActiveMember = membership === "silver" || membership === "gold";
//   const aiQuota = (user as any).aiQuota ?? null;

//   const quotaTotal =
//     membership === "gold" ? 100 : membership === "silver" ? 20 : 0;
//   const used = aiQuota?.used ?? 0;
//   const remaining =
//     quotaRemaining !== null ? quotaRemaining : Math.max(0, quotaTotal - used);
//   const outOfCredits = remaining <= 0;

//   // ── Non-member gate ───────────────────────────────────────────────────────
//   if (!isActiveMember) {
//     return (
//       <div
//         className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//       >
//         <PageTitle sub="Science-backed meal plans tailored to your goals">
//           AI Nutrition <span className="text-primary">Coach</span>
//         </PageTitle>
//         <div className="mk2-card flex flex-col items-center justify-center py-16 gap-4 text-center">
//           <span className="text-5xl">🔒</span>
//           <div className="font-bold text-lg">Members Only</div>
//           <div className="text-sm text-muted-foreground max-w-xs">
//             AI Nutrition Coaching is available on Silver and Gold plans. Upgrade
//             your membership to unlock personalised meal plans.
//           </div>
//           <Btn variant="primary" onClick={() => {}}>
//             View Plans →
//           </Btn>
//         </div>
//       </div>
//     );
//   }

//   const handleBmrPaste = (text: string) => {
//     setBmrPaste(text);
//     setBmrApplied(false);
//     if (text.trim()) {
//       const extracted = extractCaloriesFromBMR(text);
//       if (extracted) {
//         setCal(extracted);
//         setBmrApplied(true);
//         toast(
//           `✓ Calories set to ${extracted} from your BMR results`,
//           "success",
//         );
//       }
//     }
//   };

//   const generate = async () => {
//     if (outOfCredits) {
//       toast("Monthly AI limit reached. Resets on the 1st.", "error");
//       return;
//     }

//     setLoading(true);
//     setResult("");
//     setAiError("");
//     logEvent("generate_nutrition", { calories: cal, blood, plan });

//     try {
//       const bmrContext = bmrPaste.trim()
//         ? ` BMR/TDEE context from user: "${bmrPaste.trim().substring(0, 300)}".`
//         : "";

//       const prompt = `${plan} for: Goal: ${user.goal} | Level: ${user.level} | Calories: ${cal}/day | Blood type: ${blood} | Diet: ${diet}.${bmrContext} Include SA ingredients. Show protein/carbs/fat.`;

//       const res = await aiChatFn({
//         prompt,
//         systemPrompt:
//           "You are a certified sports nutritionist at MK2 Rivers Fitness, South Africa. Create practical meal plans with exact portions, SA food options, and macros per meal plus daily totals. Consider the user's blood type for optimal food choices when relevant.",
//         mode: "nutrition",
//       });
//       const data = res.data as { response: string; quotaRemaining: number };
//       setResult(data.response);
//       setQuotaRemaining(data.quotaRemaining);
//     } catch (err: any) {
//       const msg: string = err?.message ?? "";
//       console.error("aiChat error:", err);
//       console.error("aiChat error message:", msg);

//       if (msg.includes("QUOTA_EXCEEDED")) {
//         setAiError(
//           "You've used all your AI calls for this month. Your quota resets on the 1st.",
//         );
//         setQuotaRemaining(0);
//       } else if (msg.includes("JOIN_GYM")) {
//         setAiError("An active membership is required to use AI features.");
//       } else {
//         setAiError("Generation failed. Please try again.");
//         toast("Generation failed", "error");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const calOptions = [
//     "1400",
//     "1600",
//     "1800",
//     "2000",
//     "2200",
//     "2500",
//     "3000",
//     "3500",
//   ];

//   const fields = [
//     { label: "Blood Type", val: blood, set: setBlood, opts: BLOOD_TYPES },
//     {
//       label: "Diet Preference",
//       val: diet,
//       set: setDiet,
//       opts: [
//         "No restrictions",
//         "Vegetarian",
//         "Vegan",
//         "Halal",
//         "Kosher",
//         "Gluten-free",
//         "Dairy-free",
//         "High Protein",
//       ],
//     },
//     {
//       label: "Plan Type",
//       val: plan,
//       set: setPlan,
//       opts: ["Lose Weight", "Muscle Gain"],
//     },
//   ];

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Science-backed meal plans tailored to your goals">
//         AI Nutrition <span className="text-primary">Coach</span>
//       </PageTitle>

//       <div className="mk2-card">
//         {/* ── AI quota counter ───────────────────────────────────────────── */}
//         <div
//           className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${
//             outOfCredits
//               ? "bg-red-500/10 border border-red-500/30"
//               : "bg-secondary"
//           }`}
//         >
//           <div className="text-xs text-muted-foreground">
//             AI calls this month
//           </div>
//           <div
//             className={`font-bold text-sm ${
//               outOfCredits
//                 ? "text-red-400"
//                 : remaining <= 5
//                   ? "text-orange-400"
//                   : "text-green-500"
//             }`}
//           >
//             {remaining} / {quotaTotal} remaining
//             {outOfCredits && " — resets on the 1st"}
//           </div>
//         </div>

//         {/* ── BMR paste field ────────────────────────────────────────────── */}
//         <div
//           className="mb-4 rounded-xl p-4"
//           style={{
//             background: "hsl(20 100% 50% / 0.05)",
//             border: "1px solid hsl(20 100% 50% / 0.2)",
//           }}
//         >
//           <div className="flex items-center justify-between mb-1.5">
//             <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
//               📋 Paste BMR / TDEE Results
//             </label>
//             {bmrApplied && (
//               <span
//                 className="text-[10px] font-bold px-2 py-0.5 rounded-full"
//                 style={{
//                   background: "hsl(142 72% 37% / 0.15)",
//                   color: "hsl(142 72% 37%)",
//                 }}
//               >
//                 ✓ Calories auto-filled
//               </span>
//             )}
//           </div>
//           <textarea
//             className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors font-body resize-none"
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               color: "hsl(var(--foreground))",
//               minHeight: 80,
//             }}
//             placeholder="Paste your BMR calculator results here — your calorie target will be filled in automatically.

// e.g. BMR: 1,820 kcal · TDEE: 2,450 kcal · Goal: 2,200 kcal"
//             value={bmrPaste}
//             onChange={(e) => handleBmrPaste(e.target.value)}
//           />
//           <p className="text-[10px] text-muted-foreground mt-1.5">
//             Copy results from the BMR Calculator tool and paste above — your
//             calories will be pre-filled automatically.
//           </p>
//         </div>

//         {/* ── Calories field (standalone, prominent) ────────────────────── */}
//         <div className="mb-4">
//           <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
//             Calories / day
//             {bmrApplied && (
//               <span
//                 className="ml-2 normal-case tracking-normal font-normal"
//                 style={{ color: "hsl(142 72% 37%)" }}
//               >
//                 (from your BMR results)
//               </span>
//             )}
//           </label>
//           <div className="flex gap-2 flex-wrap">
//             {calOptions.map((c) => (
//               <button
//                 key={c}
//                 onClick={() => {
//                   setCal(c);
//                   setBmrApplied(false);
//                 }}
//                 className="px-3 py-2 rounded-lg font-bold text-xs border-none cursor-pointer transition-all"
//                 style={{
//                   background:
//                     cal === c ? "hsl(20 100% 50%)" : "hsl(var(--secondary))",
//                   color: cal === c ? "#000" : "hsl(var(--foreground))",
//                   border: `1px solid ${cal === c ? "hsl(20 100% 50%)" : "hsl(var(--border))"}`,
//                 }}
//               >
//                 {c}
//               </button>
//             ))}
//             {!calOptions.includes(cal) && (
//               <button
//                 className="px-3 py-2 rounded-lg font-bold text-xs border-none cursor-pointer"
//                 style={{
//                   background: "hsl(20 100% 50%)",
//                   color: "#000",
//                 }}
//               >
//                 {cal} ✓
//               </button>
//             )}
//           </div>
//         </div>

//         <div
//           className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
//         >
//           {fields.map((f) => (
//             <div key={f.label}>
//               <label className="mk2-label">{f.label}</label>
//               <select
//                 className="mk2-select"
//                 value={f.val}
//                 onChange={(e) => f.set(e.target.value)}
//               >
//                 {f.opts.map((o) => (
//                   <option key={o}>{o}</option>
//                 ))}
//               </select>
//             </div>
//           ))}
//         </div>

//         <Btn
//           variant="primary"
//           onClick={generate}
//           disabled={loading || outOfCredits}
//         >
//           🥗{" "}
//           {loading
//             ? "Building plan…"
//             : outOfCredits
//               ? "No AI Calls Left"
//               : "Generate Meal Plan"}
//         </Btn>

//         {aiError && (
//           <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
//             {aiError}
//           </div>
//         )}

//         {result && <div className="mk2-ai-box mt-4">{result}</div>}
//       </div>
//     </div>
//   );
// }
