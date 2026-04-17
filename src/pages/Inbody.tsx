import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

// ── Cloud Function ────────────────────────────────────────────────────────────
const aiChatFn = httpsCallable(getFunctions(), "aiChat");

// MK2R CHECK-IN GPS — corrected coordinates
// 29 Peter Rd, Tres Jolie AH, Roodepoort
const GYM_LAT = -26.073057;
const GYM_LNG = 27.888273;
const RADIUS_METERS = 20;

interface InBodyEntry {
  date: number;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  fatMass: number;
  visceralFat: number;
  totalBodyWater: number;
  notes: string;
  hasFile: boolean;
}

interface Props {
  setPage: (page: string) => void;
}

// ── Parse numbers out of text extracted from InBody report ───────────────────
function parseInBodyText(text: string): Partial<{
  weight: string;
  bodyFat: string;
  muscleMass: string;
  fatMass: string;
  visceralFat: string;
  totalBodyWater: string;
}> {
  const result: Record<string, string> = {};

  // Common InBody label patterns — matches values like "78.5" or "78.5 kg"
  const patterns: Array<[string, RegExp]> = [
    ["weight", /(?:weight|body weight)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i],
    [
      "bodyFat",
      /(?:percent(?:age)? ?body fat|pbf|body fat %)\s*[:\-]?\s*([\d.]+)/i,
    ],
    [
      "muscleMass",
      /(?:skeletal muscle mass|smm|muscle mass)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i,
    ],
    ["fatMass", /(?:body fat mass|fat mass)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i],
    ["visceralFat", /(?:visceral fat (?:level|area)|vfa)\s*[:\-]?\s*([\d.]+)/i],
    [
      "totalBodyWater",
      /(?:total body water|tbw)\s*[:\-]?\s*([\d.]+)\s*(?:l)?/i,
    ],
  ];

  for (const [key, regex] of patterns) {
    const match = text.match(regex);
    if (match) result[key] = match[1];
  }

  return result;
}

export function InBody({ setPage }: Props) {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const fileRef = useRef<HTMLInputElement>(null);

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [fatMass, setFatMass] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [totalBodyWater, setTotalBodyWater] = useState("");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);
  const [aiError, setAiError] = useState("");

  if (!user) return null;

  const membership = (user as any).membership ?? "basic";
  const isActiveMember = membership === "silver" || membership === "gold";
  const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

  // ── File upload handler — tries to extract values via OCR/text ────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileProcessing(true);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64, prefix
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const isPDF = file.type === "application/pdf";
      const mediaType = isPDF
        ? "application/pdf"
        : (file.type as any) || "image/jpeg";

      // Call Claude to extract InBody values from the uploaded image/PDF
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: isPDF ? "document" : "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `This is an InBody body composition report. Extract ONLY these values as a JSON object with these exact keys (use null if not found):
{
  "weight": number (kg),
  "bodyFat": number (percentage, e.g. 18.2 not 0.182),
  "muscleMass": number (kg, skeletal muscle mass),
  "fatMass": number (kg, body fat mass),
  "visceralFat": number (visceral fat level/score),
  "totalBodyWater": number (litres)
}
Respond ONLY with the JSON object, no other text.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json();
      const textContent =
        data.content?.find((b: any) => b.type === "text")?.text || "";

      // Clean and parse the JSON response
      const cleaned = textContent.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Count extracted fields
      let filled = 0;
      if (parsed.weight != null) filled++;
      if (parsed.bodyFat != null) filled++;
      if (parsed.muscleMass != null) filled++;
      if (parsed.fatMass != null) filled++;
      if (parsed.visceralFat != null) filled++;
      if (parsed.totalBodyWater != null) filled++;

      if (filled > 0) {
        // Build and save the entry immediately with extracted values
        const entry: InBodyEntry = {
          date: Date.now(),
          weight: parsed.weight ?? 0,
          bodyFat: parsed.bodyFat ?? 0,
          muscleMass: parsed.muscleMass ?? 0,
          fatMass: parsed.fatMass ?? 0,
          visceralFat: parsed.visceralFat ?? 0,
          totalBodyWater: parsed.totalBodyWater ?? 0,
          notes: "",
          hasFile: true,
        };

        try {
          await updateUser({
            ...user,
            inbodyHistory: [entry, ...inbodyHistory],
          } as any);

          // Also pre-fill the form fields for review
          if (parsed.weight != null) setWeight(String(parsed.weight));
          if (parsed.bodyFat != null) setBodyFat(String(parsed.bodyFat));
          if (parsed.muscleMass != null)
            setMuscleMass(String(parsed.muscleMass));
          if (parsed.fatMass != null) setFatMass(String(parsed.fatMass));
          if (parsed.visceralFat != null)
            setVisceralFat(String(parsed.visceralFat));
          if (parsed.totalBodyWater != null)
            setTotalBodyWater(String(parsed.totalBodyWater));

          toast(
            `✅ Extracted ${filled} values and saved your assessment!`,
            "success",
          );
        } catch (err) {
          console.error("Auto-save failed:", err);
          // Still pre-fill the form so user can manually save
          if (parsed.weight != null) setWeight(String(parsed.weight));
          if (parsed.bodyFat != null) setBodyFat(String(parsed.bodyFat));
          if (parsed.muscleMass != null)
            setMuscleMass(String(parsed.muscleMass));
          if (parsed.fatMass != null) setFatMass(String(parsed.fatMass));
          if (parsed.visceralFat != null)
            setVisceralFat(String(parsed.visceralFat));
          if (parsed.totalBodyWater != null)
            setTotalBodyWater(String(parsed.totalBodyWater));
          toast(
            "⚠️ Values extracted but failed to save — press Save Assessment manually",
            "error",
          );
        }
      } else {
        toast(
          "⚠️ Could not extract values — please enter them manually",
          "error",
        );
      }
    } catch (err: any) {
      console.error("File extraction error:", err);
      toast(
        "⚠️ Could not read file automatically — please enter values manually",
        "error",
      );
    } finally {
      setFileProcessing(false);
    }
  };

  const saveEntry = async () => {
    if (!weight) return toast("Enter at least your weight", "error");
    const entry: InBodyEntry = {
      date: Date.now(),
      weight: parseFloat(weight),
      bodyFat: parseFloat(bodyFat) || 0,
      muscleMass: parseFloat(muscleMass) || 0,
      fatMass: parseFloat(fatMass) || 0,
      visceralFat: parseFloat(visceralFat) || 0,
      totalBodyWater: parseFloat(totalBodyWater) || 0,
      notes,
      hasFile: !!fileName,
    };
    try {
      await updateUser({
        ...user,
        inbodyHistory: [entry, ...inbodyHistory],
      } as any);
      toast("✅ InBody assessment saved!", "success");
      setWeight("");
      setBodyFat("");
      setMuscleMass("");
      setFatMass("");
      setVisceralFat("");
      setTotalBodyWater("");
      setNotes("");
      setFileName(null);
    } catch {
      toast("❌ Failed to save — please try again", "error");
    }
  };

  const analyseEntry = async (entry: InBodyEntry) => {
    if (!isActiveMember) {
      toast("Upgrade your membership to unlock AI analysis.", "error");
      return;
    }

    setActiveEntry(entry);
    setAnalysing(true);
    setAnalysis("");
    setAiError("");

    const prev = inbodyHistory.find((e) => e.date !== entry.date);

    try {
      const prompt = `Analyse this InBody for ${user.name}, Goal: "${user.goal}", Level: ${user.level}:
Weight: ${entry.weight}kg | Body Fat: ${entry.bodyFat}% | Muscle Mass: ${entry.muscleMass}kg
Fat Mass: ${entry.fatMass}kg | Visceral Fat: ${entry.visceralFat} | Body Water: ${entry.totalBodyWater}L
${prev ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg | Fat Mass ${prev.fatMass}kg` : "First assessment."}
Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`;

      const res = await aiChatFn({
        prompt,
        systemPrompt:
          "You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.",
        mode: "inbody",
      });
      const data = res.data as { response: string; quotaRemaining: number };
      setAnalysis(data.response);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("QUOTA_EXCEEDED")) {
        setAiError(
          "You've used all your AI calls for this month. Quota resets on the 1st.",
        );
        setAnalysis("");
      } else if (msg.includes("JOIN_GYM")) {
        setAnalysis("An active membership is required to use AI analysis.");
      } else {
        setAnalysis("AI analysis unavailable — please try again later.");
      }
    } finally {
      setAnalysing(false);
    }
  };

  const inputCls =
    "w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-foreground text-sm outline-none font-body focus:border-primary/40 transition-colors";
  const lblCls =
    "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5";

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Enter your InBody scan results — AI analyses your body composition">
        InBody <span className="text-primary">Assessment</span>
      </PageTitle>

      {/* AI locked notice */}
      {!isActiveMember && (
        <div
          className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
          style={{
            background: "hsl(263 85% 58% / 0.08)",
            border: "1px solid hsl(263 85% 58% / 0.25)",
            color: "hsl(263 85% 58%)",
          }}
        >
          <span className="text-base shrink-0">🔒</span>
          <span>
            <strong>AI Analysis locked</strong> — Upgrade to Silver or Gold to
            unlock AI body composition analysis.
          </span>
        </div>
      )}

      {/* Link to Progress Report */}
      {inbodyHistory.length > 0 && (
        <div
          className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          style={{
            background: "hsl(187 85% 40% / 0.1)",
            border: "1px solid hsl(187 85% 40% / 0.3)",
          }}
          onClick={() => setPage("Progress")}
        >
          <div>
            <p
              className="font-bold text-sm"
              style={{ color: "hsl(187 85% 40%)" }}
            >
              📈 View your Progress Report
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              See graphs of all your InBody metrics over time
            </p>
          </div>
          <span className="text-xl">→</span>
        </div>
      )}

      <div
        className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"} mb-6`}
      >
        {/* Manual entry */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-4">Enter Results Manually</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                label: "Weight (kg)",
                val: weight,
                set: setWeight,
                placeholder: "78.5",
              },
              {
                label: "Body Fat (%)",
                val: bodyFat,
                set: setBodyFat,
                placeholder: "18.2",
              },
              {
                label: "Muscle Mass (kg)",
                val: muscleMass,
                set: setMuscleMass,
                placeholder: "35.4",
              },
              {
                label: "Fat Mass (kg)",
                val: fatMass,
                set: setFatMass,
                placeholder: "14.2",
              },
              {
                label: "Visceral Fat",
                val: visceralFat,
                set: setVisceralFat,
                placeholder: "7",
              },
              {
                label: "Body Water (L)",
                val: totalBodyWater,
                set: setTotalBodyWater,
                placeholder: "41.2",
              },
            ].map((f) => (
              <div key={f.label}>
                <label className={lblCls}>{f.label}</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder={f.placeholder}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="mb-3">
            <label className={lblCls}>Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="e.g. pre-breakfast, after 4 weeks training"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="primary" onClick={saveEntry}>
              Save Assessment
            </Btn>
            {inbodyHistory.length > 0 && (
              <Btn variant="ghost" onClick={() => setPage("Progress")}>
                📈 Progress Report
              </Btn>
            )}
          </div>
        </div>

        {/* File upload */}
        <div className="mk2-card flex flex-col">
          <div className="font-bold text-sm mb-2">Upload InBody Report</div>
          <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Upload your InBody printout (photo or PDF). We'll automatically
            extract your metrics and save the assessment.
          </div>
          <div
            onClick={() => !fileProcessing && fileRef.current?.click()}
            className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors min-h-[140px]"
            style={{ opacity: fileProcessing ? 0.7 : 1 }}
          >
            {fileProcessing ? (
              <>
                <span className="text-3xl animate-pulse">🔍</span>
                <div className="font-bold text-sm text-primary">
                  Extracting values…
                </div>
                <div className="text-xs text-muted-foreground">
                  Reading your InBody report
                </div>
              </>
            ) : fileName ? (
              <>
                <span className="text-3xl">📄</span>
                <div className="font-bold text-sm text-primary">{fileName}</div>
                <div className="text-xs text-muted-foreground">
                  Click to change
                </div>
              </>
            ) : (
              <>
                <span className="text-4xl">📤</span>
                <div className="font-bold text-sm">Click to upload</div>
                <div className="text-xs text-muted-foreground">
                  JPG, PNG or PDF — values auto-extracted & saved
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFile}
            disabled={fileProcessing}
          />
          <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
            ℹ️ Upload your report — values are extracted and saved
            automatically.
          </div>
        </div>
      </div>

      {/* AI error banner */}
      {aiError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {aiError}
        </div>
      )}

      {/* History */}
      {inbodyHistory.length > 0 && (
        <div className="mk2-card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm">
              Assessment History ({inbodyHistory.length})
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setPage("Progress")}>
              📈 View Graphs
            </Btn>
          </div>
          <div className="flex flex-col gap-3">
            {inbodyHistory.map((entry, i) => (
              <motion.div
                key={entry.date}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-secondary rounded-xl p-4"
              >
                <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
                  <div>
                    <div className="font-bold text-sm">
                      {new Date(entry.date).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.notes}
                      </div>
                    )}
                    {entry.hasFile && (
                      <div className="text-[10px] text-primary mt-0.5">
                        📎 Report attached
                      </div>
                    )}
                  </div>
                  {isActiveMember ? (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => analyseEntry(entry)}
                    >
                      🤖 AI Analyse
                    </Btn>
                  ) : (
                    <div className="text-[11px] text-muted-foreground px-2 py-1 rounded border border-border">
                      🔒 AI — Members only
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Weight",
                      value: `${entry.weight}kg`,
                      color: "hsl(20 100% 50%)",
                    },
                    {
                      label: "Body Fat",
                      value: `${entry.bodyFat}%`,
                      color: "hsl(0 84% 51%)",
                    },
                    {
                      label: "Muscle",
                      value: `${entry.muscleMass}kg`,
                      color: "hsl(142 72% 37%)",
                    },
                    {
                      label: "Fat Mass",
                      value: entry.fatMass ? `${entry.fatMass}kg` : "—",
                      color: "hsl(38 92% 44%)",
                    },
                    {
                      label: "Visceral",
                      value: entry.visceralFat || "—",
                      color: "hsl(263 85% 58%)",
                    },
                    {
                      label: "Water",
                      value: entry.totalBodyWater
                        ? `${entry.totalBodyWater}L`
                        : "—",
                      color: "hsl(187 85% 40%)",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-background rounded-lg px-3 py-2 text-center"
                    >
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">
                        {s.label}
                      </div>
                      <div
                        className="font-display text-lg leading-none"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
                {activeEntry?.date === entry.date && (
                  <div className="mt-4">
                    {analysing ? (
                      <div className="text-xs text-muted-foreground animate-pulse">
                        🤖 Analysing your body composition…
                      </div>
                    ) : analysis ? (
                      <div className="bg-background border border-primary/20 rounded-xl p-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {analysis}
                      </div>
                    ) : null}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* About InBody */}
      <div
        className="mk2-card"
        style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
      >
        <div className="font-bold text-sm mb-3 flex items-center gap-2">
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: "hsl(187 85% 40%)" }}
          >
            monitor_heart
          </span>
          About InBody at MK2R
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 mb-4">
          {[
            {
              icon: "⚡",
              label: "Skeletal Muscle Mass",
              color: "hsl(142 72% 37%)",
            },
            {
              icon: "🔥",
              label: "Body Fat Percentage",
              color: "hsl(0 84% 51%)",
            },
            {
              icon: "💧",
              label: "Total Body Water",
              color: "hsl(187 85% 40%)",
            },
            {
              icon: "📊",
              label: "Segmental Analysis",
              color: "hsl(217 91% 53%)",
            },
            {
              icon: "🎯",
              label: "Visceral Fat Level",
              color: "hsl(38 92% 44%)",
            },
            { icon: "⚖️", label: "Fat Mass (kg)", color: "hsl(38 92% 44%)" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{
                background: `${item.color}12`,
                border: `1px solid ${item.color}30`,
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xs font-medium text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            MK2 Rivers Fitness uses the{" "}
            <strong className="text-foreground">
              InBody body composition analyser
            </strong>{" "}
            — a medical-grade scanner that goes far beyond just weight.
          </p>
          <p>
            <strong className="text-foreground">How to scan:</strong> Visit
            reception at MK2R Ruimsig (29 Peter Rd, Tres Jolie AH, Roodepoort).
            The scan takes 60 seconds — stand barefoot on the platform and hold
            the handles.
          </p>
          <p>
            <strong className="text-foreground">Best results tip:</strong> Scan
            first thing in the morning, before eating or training, after using
            the bathroom.
          </p>
          <div
            className="rounded-lg px-3 py-2.5 mt-1"
            style={{
              background: "hsl(187 85% 40% / 0.08)",
              border: "1px solid hsl(187 85% 40% / 0.25)",
            }}
          >
            <p className="font-bold" style={{ color: "hsl(187 85% 40%)" }}>
              📍 MK2R Ruimsig · 29 Peter Rd, Tres Jolie AH, Roodepoort
            </p>
            <p className="mt-1">
              Ask a coach or front desk to assist with your scan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// import { useState, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { getFunctions, httpsCallable } from "firebase/functions";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// // ── Cloud Function ────────────────────────────────────────────────────────────
// const aiChatFn = httpsCallable(getFunctions(), "aiChat");

// // MK2R CHECK-IN GPS — corrected coordinates
// // 29 Peter Rd, Tres Jolie AH, Roodepoort
// const GYM_LAT = -26.073057;
// const GYM_LNG = 27.888273;
// const RADIUS_METERS = 20;

// interface InBodyEntry {
//   date: number;
//   weight: number;
//   bodyFat: number;
//   muscleMass: number;
//   fatMass: number;
//   visceralFat: number;
//   totalBodyWater: number;
//   notes: string;
//   hasFile: boolean;
// }

// interface Props {
//   setPage: (page: string) => void;
// }

// // ── Parse numbers out of text extracted from InBody report ───────────────────
// function parseInBodyText(text: string): Partial<{
//   weight: string;
//   bodyFat: string;
//   muscleMass: string;
//   fatMass: string;
//   visceralFat: string;
//   totalBodyWater: string;
// }> {
//   const result: Record<string, string> = {};

//   // Common InBody label patterns — matches values like "78.5" or "78.5 kg"
//   const patterns: Array<[string, RegExp]> = [
//     ["weight", /(?:weight|body weight)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i],
//     [
//       "bodyFat",
//       /(?:percent(?:age)? ?body fat|pbf|body fat %)\s*[:\-]?\s*([\d.]+)/i,
//     ],
//     [
//       "muscleMass",
//       /(?:skeletal muscle mass|smm|muscle mass)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i,
//     ],
//     ["fatMass", /(?:body fat mass|fat mass)\s*[:\-]?\s*([\d.]+)\s*(?:kg)?/i],
//     ["visceralFat", /(?:visceral fat (?:level|area)|vfa)\s*[:\-]?\s*([\d.]+)/i],
//     [
//       "totalBodyWater",
//       /(?:total body water|tbw)\s*[:\-]?\s*([\d.]+)\s*(?:l)?/i,
//     ],
//   ];

//   for (const [key, regex] of patterns) {
//     const match = text.match(regex);
//     if (match) result[key] = match[1];
//   }

//   return result;
// }

// export function InBody({ setPage }: Props) {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const fileRef = useRef<HTMLInputElement>(null);

//   const [weight, setWeight] = useState("");
//   const [bodyFat, setBodyFat] = useState("");
//   const [muscleMass, setMuscleMass] = useState("");
//   const [fatMass, setFatMass] = useState("");
//   const [visceralFat, setVisceralFat] = useState("");
//   const [totalBodyWater, setTotalBodyWater] = useState("");
//   const [notes, setNotes] = useState("");
//   const [fileName, setFileName] = useState<string | null>(null);
//   const [fileProcessing, setFileProcessing] = useState(false);
//   const [analysis, setAnalysis] = useState("");
//   const [analysing, setAnalysing] = useState(false);
//   const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);
//   const [aiError, setAiError] = useState("");

//   if (!user) return null;

//   const membership = (user as any).membership ?? "basic";
//   const isActiveMember = membership === "silver" || membership === "gold";
//   const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

//   // ── File upload handler — tries to extract values via OCR/text ────────────
//   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setFileName(file.name);
//     setFileProcessing(true);

//     try {
//       // Read file as base64
//       const base64 = await new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           const result = reader.result as string;
//           resolve(result.split(",")[1]); // strip data:...;base64, prefix
//         };
//         reader.onerror = () => reject(new Error("Failed to read file"));
//         reader.readAsDataURL(file);
//       });

//       const isPDF = file.type === "application/pdf";
//       const mediaType = isPDF
//         ? "application/pdf"
//         : (file.type as any) || "image/jpeg";

//       // Call Claude to extract InBody values from the uploaded image/PDF
//       const response = await fetch("https://api.anthropic.com/v1/messages", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           model: "claude-sonnet-4-20250514",
//           max_tokens: 1000,
//           messages: [
//             {
//               role: "user",
//               content: [
//                 {
//                   type: isPDF ? "document" : "image",
//                   source: {
//                     type: "base64",
//                     media_type: mediaType,
//                     data: base64,
//                   },
//                 },
//                 {
//                   type: "text",
//                   text: `This is an InBody body composition report. Extract ONLY these values as a JSON object with these exact keys (use null if not found):
// {
//   "weight": number (kg),
//   "bodyFat": number (percentage, e.g. 18.2 not 0.182),
//   "muscleMass": number (kg, skeletal muscle mass),
//   "fatMass": number (kg, body fat mass),
//   "visceralFat": number (visceral fat level/score),
//   "totalBodyWater": number (litres)
// }
// Respond ONLY with the JSON object, no other text.`,
//                 },
//               ],
//             },
//           ],
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`API error ${response.status}`);
//       }

//       const data = await response.json();
//       const textContent =
//         data.content?.find((b: any) => b.type === "text")?.text || "";

//       // Clean and parse the JSON response
//       const cleaned = textContent.replace(/```json|```/g, "").trim();
//       const parsed = JSON.parse(cleaned);

//       // Pre-fill form fields with extracted values
//       let filled = 0;
//       if (parsed.weight != null) {
//         setWeight(String(parsed.weight));
//         filled++;
//       }
//       if (parsed.bodyFat != null) {
//         setBodyFat(String(parsed.bodyFat));
//         filled++;
//       }
//       if (parsed.muscleMass != null) {
//         setMuscleMass(String(parsed.muscleMass));
//         filled++;
//       }
//       if (parsed.fatMass != null) {
//         setFatMass(String(parsed.fatMass));
//         filled++;
//       }
//       if (parsed.visceralFat != null) {
//         setVisceralFat(String(parsed.visceralFat));
//         filled++;
//       }
//       if (parsed.totalBodyWater != null) {
//         setTotalBodyWater(String(parsed.totalBodyWater));
//         filled++;
//       }

//       if (filled > 0) {
//         toast(
//           `✅ Extracted ${filled} values from your report — review and save`,
//           "success",
//         );
//       } else {
//         toast(
//           "⚠️ Could not extract values — please enter them manually",
//           "error",
//         );
//       }
//     } catch (err: any) {
//       console.error("File extraction error:", err);
//       // Graceful fallback — file is still attached, user fills in manually
//       toast(
//         "⚠️ Could not read file automatically — please enter values manually",
//         "error",
//       );
//     } finally {
//       setFileProcessing(false);
//     }
//   };

//   const saveEntry = async () => {
//     if (!weight) return toast("Enter at least your weight", "error");
//     const entry: InBodyEntry = {
//       date: Date.now(),
//       weight: parseFloat(weight),
//       bodyFat: parseFloat(bodyFat) || 0,
//       muscleMass: parseFloat(muscleMass) || 0,
//       fatMass: parseFloat(fatMass) || 0,
//       visceralFat: parseFloat(visceralFat) || 0,
//       totalBodyWater: parseFloat(totalBodyWater) || 0,
//       notes,
//       hasFile: !!fileName,
//     };
//     try {
//       await updateUser({
//         ...user,
//         inbodyHistory: [entry, ...inbodyHistory],
//       } as any);
//       toast("✅ InBody assessment saved!", "success");
//       setWeight("");
//       setBodyFat("");
//       setMuscleMass("");
//       setFatMass("");
//       setVisceralFat("");
//       setTotalBodyWater("");
//       setNotes("");
//       setFileName(null);
//     } catch {
//       toast("❌ Failed to save — please try again", "error");
//     }
//   };

//   const analyseEntry = async (entry: InBodyEntry) => {
//     if (!isActiveMember) {
//       toast("Upgrade your membership to unlock AI analysis.", "error");
//       return;
//     }

//     setActiveEntry(entry);
//     setAnalysing(true);
//     setAnalysis("");
//     setAiError("");

//     const prev = inbodyHistory.find((e) => e.date !== entry.date);

//     try {
//       const prompt = `Analyse this InBody for ${user.name}, Goal: "${user.goal}", Level: ${user.level}:
// Weight: ${entry.weight}kg | Body Fat: ${entry.bodyFat}% | Muscle Mass: ${entry.muscleMass}kg
// Fat Mass: ${entry.fatMass}kg | Visceral Fat: ${entry.visceralFat} | Body Water: ${entry.totalBodyWater}L
// ${prev ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg | Fat Mass ${prev.fatMass}kg` : "First assessment."}
// Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`;

//       const res = await aiChatFn({
//         prompt,
//         systemPrompt:
//           "You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.",
//         mode: "inbody",
//       });
//       const data = res.data as { response: string; quotaRemaining: number };
//       setAnalysis(data.response);
//     } catch (err: any) {
//       const msg: string = err?.message ?? "";
//       if (msg.includes("QUOTA_EXCEEDED")) {
//         setAiError(
//           "You've used all your AI calls for this month. Quota resets on the 1st.",
//         );
//         setAnalysis("");
//       } else if (msg.includes("JOIN_GYM")) {
//         setAnalysis("An active membership is required to use AI analysis.");
//       } else {
//         setAnalysis("AI analysis unavailable — please try again later.");
//       }
//     } finally {
//       setAnalysing(false);
//     }
//   };

//   const inputCls =
//     "w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-foreground text-sm outline-none font-body focus:border-primary/40 transition-colors";
//   const lblCls =
//     "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5";

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Enter your InBody scan results — AI analyses your body composition">
//         InBody <span className="text-primary">Assessment</span>
//       </PageTitle>

//       {/* AI locked notice */}
//       {!isActiveMember && (
//         <div
//           className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
//           style={{
//             background: "hsl(263 85% 58% / 0.08)",
//             border: "1px solid hsl(263 85% 58% / 0.25)",
//             color: "hsl(263 85% 58%)",
//           }}
//         >
//           <span className="text-base shrink-0">🔒</span>
//           <span>
//             <strong>AI Analysis locked</strong> — Upgrade to Silver or Gold to
//             unlock AI body composition analysis.
//           </span>
//         </div>
//       )}

//       {/* Link to Progress Report */}
//       {inbodyHistory.length > 0 && (
//         <div
//           className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:opacity-90 transition-opacity"
//           style={{
//             background: "hsl(187 85% 40% / 0.1)",
//             border: "1px solid hsl(187 85% 40% / 0.3)",
//           }}
//           onClick={() => setPage("Progress")}
//         >
//           <div>
//             <p
//               className="font-bold text-sm"
//               style={{ color: "hsl(187 85% 40%)" }}
//             >
//               📈 View your Progress Report
//             </p>
//             <p className="text-xs text-muted-foreground mt-0.5">
//               See graphs of all your InBody metrics over time
//             </p>
//           </div>
//           <span className="text-xl">→</span>
//         </div>
//       )}

//       <div
//         className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"} mb-6`}
//       >
//         {/* Manual entry */}
//         <div className="mk2-card">
//           <div className="font-bold text-sm mb-4">Enter Results Manually</div>
//           <div className="grid grid-cols-2 gap-3 mb-3">
//             {[
//               {
//                 label: "Weight (kg)",
//                 val: weight,
//                 set: setWeight,
//                 placeholder: "78.5",
//               },
//               {
//                 label: "Body Fat (%)",
//                 val: bodyFat,
//                 set: setBodyFat,
//                 placeholder: "18.2",
//               },
//               {
//                 label: "Muscle Mass (kg)",
//                 val: muscleMass,
//                 set: setMuscleMass,
//                 placeholder: "35.4",
//               },
//               {
//                 label: "Fat Mass (kg)",
//                 val: fatMass,
//                 set: setFatMass,
//                 placeholder: "14.2",
//               },
//               {
//                 label: "Visceral Fat",
//                 val: visceralFat,
//                 set: setVisceralFat,
//                 placeholder: "7",
//               },
//               {
//                 label: "Body Water (L)",
//                 val: totalBodyWater,
//                 set: setTotalBodyWater,
//                 placeholder: "41.2",
//               },
//             ].map((f) => (
//               <div key={f.label}>
//                 <label className={lblCls}>{f.label}</label>
//                 <input
//                   type="number"
//                   step="0.1"
//                   className={inputCls}
//                   placeholder={f.placeholder}
//                   value={f.val}
//                   onChange={(e) => f.set(e.target.value)}
//                 />
//               </div>
//             ))}
//           </div>
//           <div className="mb-3">
//             <label className={lblCls}>Notes</label>
//             <textarea
//               className={`${inputCls} resize-none`}
//               rows={2}
//               placeholder="e.g. pre-breakfast, after 4 weeks training"
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//             />
//           </div>
//           <div className="flex gap-2 flex-wrap">
//             <Btn variant="primary" onClick={saveEntry}>
//               Save Assessment
//             </Btn>
//             {inbodyHistory.length > 0 && (
//               <Btn variant="ghost" onClick={() => setPage("Progress")}>
//                 📈 Progress Report
//               </Btn>
//             )}
//           </div>
//         </div>

//         {/* File upload */}
//         <div className="mk2-card flex flex-col">
//           <div className="font-bold text-sm mb-2">Upload InBody Report</div>
//           <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
//             Upload your InBody printout (photo or PDF). We'll automatically
//             extract your metrics and pre-fill the form.
//           </div>
//           <div
//             onClick={() => !fileProcessing && fileRef.current?.click()}
//             className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors min-h-[140px]"
//             style={{ opacity: fileProcessing ? 0.7 : 1 }}
//           >
//             {fileProcessing ? (
//               <>
//                 <span className="text-3xl animate-pulse">🔍</span>
//                 <div className="font-bold text-sm text-primary">
//                   Extracting values…
//                 </div>
//                 <div className="text-xs text-muted-foreground">
//                   Reading your InBody report
//                 </div>
//               </>
//             ) : fileName ? (
//               <>
//                 <span className="text-3xl">📄</span>
//                 <div className="font-bold text-sm text-primary">{fileName}</div>
//                 <div className="text-xs text-muted-foreground">
//                   Click to change
//                 </div>
//               </>
//             ) : (
//               <>
//                 <span className="text-4xl">📤</span>
//                 <div className="font-bold text-sm">Click to upload</div>
//                 <div className="text-xs text-muted-foreground">
//                   JPG, PNG or PDF — values auto-extracted
//                 </div>
//               </>
//             )}
//           </div>
//           <input
//             ref={fileRef}
//             type="file"
//             accept="image/*,.pdf"
//             className="hidden"
//             onChange={handleFile}
//             disabled={fileProcessing}
//           />
//           <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
//             ℹ️ After upload, review the auto-filled numbers above, then press{" "}
//             <strong>Save Assessment</strong>.
//           </div>
//         </div>
//       </div>

//       {/* AI error banner */}
//       {aiError && (
//         <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
//           {aiError}
//         </div>
//       )}

//       {/* History */}
//       {inbodyHistory.length > 0 && (
//         <div className="mk2-card mb-5">
//           <div className="flex items-center justify-between mb-4">
//             <div className="font-bold text-sm">
//               Assessment History ({inbodyHistory.length})
//             </div>
//             <Btn variant="ghost" size="sm" onClick={() => setPage("Progress")}>
//               📈 View Graphs
//             </Btn>
//           </div>
//           <div className="flex flex-col gap-3">
//             {inbodyHistory.map((entry, i) => (
//               <motion.div
//                 key={entry.date}
//                 initial={{ opacity: 0, x: -6 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: i * 0.05 }}
//                 className="bg-secondary rounded-xl p-4"
//               >
//                 <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
//                   <div>
//                     <div className="font-bold text-sm">
//                       {new Date(entry.date).toLocaleDateString("en-ZA", {
//                         day: "numeric",
//                         month: "long",
//                         year: "numeric",
//                       })}
//                     </div>
//                     {entry.notes && (
//                       <div className="text-xs text-muted-foreground mt-0.5">
//                         {entry.notes}
//                       </div>
//                     )}
//                     {entry.hasFile && (
//                       <div className="text-[10px] text-primary mt-0.5">
//                         📎 Report attached
//                       </div>
//                     )}
//                   </div>
//                   {isActiveMember ? (
//                     <Btn
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => analyseEntry(entry)}
//                     >
//                       🤖 AI Analyse
//                     </Btn>
//                   ) : (
//                     <div className="text-[11px] text-muted-foreground px-2 py-1 rounded border border-border">
//                       🔒 AI — Members only
//                     </div>
//                   )}
//                 </div>
//                 <div className="grid grid-cols-3 gap-2">
//                   {[
//                     {
//                       label: "Weight",
//                       value: `${entry.weight}kg`,
//                       color: "hsl(20 100% 50%)",
//                     },
//                     {
//                       label: "Body Fat",
//                       value: `${entry.bodyFat}%`,
//                       color: "hsl(0 84% 51%)",
//                     },
//                     {
//                       label: "Muscle",
//                       value: `${entry.muscleMass}kg`,
//                       color: "hsl(142 72% 37%)",
//                     },
//                     {
//                       label: "Fat Mass",
//                       value: entry.fatMass ? `${entry.fatMass}kg` : "—",
//                       color: "hsl(38 92% 44%)",
//                     },
//                     {
//                       label: "Visceral",
//                       value: entry.visceralFat || "—",
//                       color: "hsl(263 85% 58%)",
//                     },
//                     {
//                       label: "Water",
//                       value: entry.totalBodyWater
//                         ? `${entry.totalBodyWater}L`
//                         : "—",
//                       color: "hsl(187 85% 40%)",
//                     },
//                   ].map((s) => (
//                     <div
//                       key={s.label}
//                       className="bg-background rounded-lg px-3 py-2 text-center"
//                     >
//                       <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">
//                         {s.label}
//                       </div>
//                       <div
//                         className="font-display text-lg leading-none"
//                         style={{ color: s.color }}
//                       >
//                         {s.value}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 {activeEntry?.date === entry.date && (
//                   <div className="mt-4">
//                     {analysing ? (
//                       <div className="text-xs text-muted-foreground animate-pulse">
//                         🤖 Analysing your body composition…
//                       </div>
//                     ) : analysis ? (
//                       <div className="bg-background border border-primary/20 rounded-xl p-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
//                         {analysis}
//                       </div>
//                     ) : null}
//                   </div>
//                 )}
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* About InBody */}
//       <div
//         className="mk2-card"
//         style={{ borderTop: "2px solid hsl(187 85% 40%)" }}
//       >
//         <div className="font-bold text-sm mb-3 flex items-center gap-2">
//           <span
//             className="material-symbols-rounded text-lg"
//             style={{ color: "hsl(187 85% 40%)" }}
//           >
//             monitor_heart
//           </span>
//           About InBody at MK2R
//         </div>
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 mb-4">
//           {[
//             {
//               icon: "⚡",
//               label: "Skeletal Muscle Mass",
//               color: "hsl(142 72% 37%)",
//             },
//             {
//               icon: "🔥",
//               label: "Body Fat Percentage",
//               color: "hsl(0 84% 51%)",
//             },
//             {
//               icon: "💧",
//               label: "Total Body Water",
//               color: "hsl(187 85% 40%)",
//             },
//             {
//               icon: "📊",
//               label: "Segmental Analysis",
//               color: "hsl(217 91% 53%)",
//             },
//             {
//               icon: "🎯",
//               label: "Visceral Fat Level",
//               color: "hsl(38 92% 44%)",
//             },
//             { icon: "⚖️", label: "Fat Mass (kg)", color: "hsl(38 92% 44%)" },
//           ].map((item) => (
//             <div
//               key={item.label}
//               className="flex items-center gap-2 rounded-lg px-3 py-2.5"
//               style={{
//                 background: `${item.color}12`,
//                 border: `1px solid ${item.color}30`,
//               }}
//             >
//               <span className="text-base">{item.icon}</span>
//               <span className="text-xs font-medium text-foreground">
//                 {item.label}
//               </span>
//             </div>
//           ))}
//         </div>
//         <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
//           <p>
//             MK2 Rivers Fitness uses the{" "}
//             <strong className="text-foreground">
//               InBody body composition analyser
//             </strong>{" "}
//             — a medical-grade scanner that goes far beyond just weight.
//           </p>
//           <p>
//             <strong className="text-foreground">How to scan:</strong> Visit
//             reception at MK2R Ruimsig (29 Peter Rd, Tres Jolie AH, Roodepoort).
//             The scan takes 60 seconds — stand barefoot on the platform and hold
//             the handles.
//           </p>
//           <p>
//             <strong className="text-foreground">Best results tip:</strong> Scan
//             first thing in the morning, before eating or training, after using
//             the bathroom.
//           </p>
//           <div
//             className="rounded-lg px-3 py-2.5 mt-1"
//             style={{
//               background: "hsl(187 85% 40% / 0.08)",
//               border: "1px solid hsl(187 85% 40% / 0.25)",
//             }}
//           >
//             <p className="font-bold" style={{ color: "hsl(187 85% 40%)" }}>
//               📍 MK2R Ruimsig · 29 Peter Rd, Tres Jolie AH, Roodepoort
//             </p>
//             <p className="mt-1">
//               Ask a coach or front desk to assist with your scan.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
