import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

// ── Cloud Function ────────────────────────────────────────────────────────────
const functions = getFunctions(undefined, "europe-west1");
const aiChatFn = httpsCallable(functions, "aiChat", { timeout: 60_000 });
const aiExtractFn = httpsCallable(functions, "aiChat", { timeout: 60_000 });

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

// ── Helper: normalise European decimal commas → dots ─────────────────────────
const parseInBodyNum = (val: any): number | null => {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
};

export function InBody({ setPage }: Props) {
  const { user, setUser, toast } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);
  const [aiError, setAiError] = useState("");
  // ✅ NEW — tracks whether values were auto-extracted and need user confirmation
  const [extractedPending, setExtractedPending] = useState(false);

  if (!user) return null;

  const membership = (user as any).membership ?? "basic";
  const isActiveMember = membership === "silver" || membership === "gold";
  const aiQuota = (user as any).aiQuota ?? null;
  const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

  const quotaTotal =
    membership === "gold" ? 100 : membership === "silver" ? 20 : 0;
  const used = aiQuota?.used ?? 0;
  const remaining = Math.max(0, quotaTotal - used);
  const outOfCredits = remaining <= 0;

  // ── Targeted Firebase write ───────────────────────────────────────────────
  const saveInbodyHistory = async (newHistory: InBodyEntry[]) => {
    await set(ref(db, `mk2_users/${user.uid}/inbodyHistory`), newHistory);
    setUser({ ...(user as any), inbodyHistory: newHistory });
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileProcessing(true);
    setExtractedPending(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const isPDF = file.type === "application/pdf";
      const mediaType = isPDF ? "application/pdf" : file.type || "image/jpeg";

      const res = await aiExtractFn({
        mode: "inbody_extract",
        fileData: base64,
        mediaType,
        isPDF,
        prompt: `This is an InBody body composition report. Extract ONLY these specific values and return them as a JSON object.

IMPORTANT NOTES:
- Numbers may use European format with commas as decimal separators (e.g. "62,5" means 62.5) — always return as numbers with decimal points
- "Weight" is the total body weight in kg (found in Body Composition Analysis section, NOT target weight)
- "bodyFat" is PBF (Percent Body Fat) shown as a percentage (e.g. 20.8, NOT 0.208)
- "muscleMass" is SMM (Skeletal Muscle Mass) in kg
- "fatMass" is Body Fat Mass in kg
- "visceralFat" is Visceral Fat Level (a number, typically 1–20)
- "totalBodyWater" is Total Body Water in litres (L)

Return ONLY this JSON object, no explanation or markdown:
{
  "weight": <number in kg>,
  "bodyFat": <PBF percentage e.g. 20.8>,
  "muscleMass": <SMM in kg>,
  "fatMass": <Body Fat Mass in kg>,
  "visceralFat": <Visceral Fat Level number>,
  "totalBodyWater": <Total Body Water in L>
}

If a value cannot be found, use null for that key.`,
        systemPrompt:
          "You are a precise data extraction assistant. Extract InBody body composition values exactly as labeled in the report. Return only valid JSON with decimal points (not commas) for numbers. Never guess — use null if a value is not clearly visible.",
      });

      const data = res.data as { response: string };
      const cleaned = data.response
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("AI returned invalid JSON — please enter manually");
      }

      const w = parseInBodyNum(parsed.weight);
      const bf = parseInBodyNum(parsed.bodyFat);
      const mm = parseInBodyNum(parsed.muscleMass);
      const fm = parseInBodyNum(parsed.fatMass);
      const vf = parseInBodyNum(parsed.visceralFat);
      const tbw = parseInBodyNum(parsed.totalBodyWater);

      const fields = [w, bf, mm, fm, vf, tbw];
      const filled = fields.filter((v) => v != null).length;

      if (filled === 0) {
        toast(
          "⚠️ Could not extract values — please enter them manually",
          "error",
        );
        return;
      }

      // Pre-fill form fields
      if (w != null) setWeight(String(w));
      if (bf != null) setBodyFat(String(bf));
      if (mm != null) setMuscleMass(String(mm));
      if (fm != null) setFatMass(String(fm));
      if (vf != null) setVisceralFat(String(vf));
      if (tbw != null) setTotalBodyWater(String(tbw));

      // ✅ Mark as pending confirmation — don't auto-save anymore.
      //    User must review the pre-filled fields and click Save Assessment.
      setExtractedPending(true);
      toast(
        `✅ ${filled}/6 values extracted — please check and save below`,
        "success",
      );
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("InBody extraction error:", err);
      toast(
        err?.message?.includes("invalid JSON")
          ? "⚠️ AI could not parse the report — please enter values manually"
          : "⚠️ Could not read file automatically — please enter values manually",
        "error",
      );
    } finally {
      setFileProcessing(false);
    }
  };

  // ── Manual save ───────────────────────────────────────────────────────────
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

    setSaving(true);
    try {
      await saveInbodyHistory([entry, ...inbodyHistory]);
      toast("✅ InBody assessment saved!", "success");
      // Reset form
      setWeight("");
      setBodyFat("");
      setMuscleMass("");
      setFatMass("");
      setVisceralFat("");
      setTotalBodyWater("");
      setNotes("");
      setFileName(null);
      setExtractedPending(false);
    } catch {
      toast("❌ Failed to save — please try again", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── AI analysis ───────────────────────────────────────────────────────────
  const analyseEntry = async (entry: InBodyEntry) => {
    if (!isActiveMember) {
      toast("Upgrade your membership to unlock AI analysis.", "error");
      return;
    }
    if (outOfCredits) {
      setAiError(
        "You've used all your AI calls for this month. Your quota resets on the 1st.",
      );
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
${
  prev
    ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg | Fat Mass ${prev.fatMass}kg`
    : "First assessment."
}
Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`;

      const res = await aiChatFn({
        prompt,
        systemPrompt:
          "You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.",
        mode: "inbody",
      });

      const data = res.data as { response: string; quotaRemaining: number };
      if (!data?.response) throw new Error("EMPTY_RESPONSE");
      setAnalysis(data.response);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (import.meta.env.DEV) console.error("aiChat inbody error:", err);

      if (msg.includes("QUOTA_EXCEEDED")) {
        setAiError(
          "You've used all your AI calls for this month. Quota resets on the 1st.",
        );
      } else if (msg.includes("JOIN_GYM")) {
        setAiError("An active membership is required to use AI analysis.");
      } else if (msg.includes("EMPTY_RESPONSE")) {
        setAiError("The AI returned an empty response. Please try again.");
      } else {
        setAiError("AI analysis unavailable — please try again later.");
      }
      setAnalysis("");
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

      {/* ── AI locked notice ───────────────────────────────────────────── */}
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

      {/* ── Quota warning ──────────────────────────────────────────────── */}
      {isActiveMember && outOfCredits && (
        <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400">
          <span className="text-base shrink-0">⚠️</span>
          <span>
            <strong>No AI calls remaining</strong> — Your monthly quota resets
            on the 1st. You can still save assessments manually.
          </span>
        </div>
      )}

      {/* ── Link to Progress Report ────────────────────────────────────── */}
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
        {/* ── Manual entry ─────────────────────────────────────────────── */}
        <div className="mk2-card">
          <div className="font-bold text-sm mb-1">Enter Results Manually</div>

          {/* ✅ Double-check banner — shown after extraction, dismissed on save */}
          {extractedPending && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl px-4 py-3 flex items-start gap-3 text-xs"
              style={{
                background: "hsl(38 92% 44% / 0.10)",
                border: "1px solid hsl(38 92% 44% / 0.35)",
                color: "hsl(38 92% 44%)",
              }}
            >
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-bold mb-0.5">
                  Please double-check your extracted values
                </p>
                <p
                  className="leading-relaxed"
                  style={{ color: "hsl(38 92% 44% / 0.85)" }}
                >
                  AI extraction can sometimes read numbers incorrectly —
                  especially on scanned or low-res reports. Compare each field
                  against your printout and correct anything that looks wrong
                  before saving.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                label: "Weight (kg)",
                val: weight,
                set: setWeight,
                placeholder: "62.5",
              },
              {
                label: "Body Fat % (PBF)",
                val: bodyFat,
                set: setBodyFat,
                placeholder: "20.8",
              },
              {
                label: "Muscle Mass (kg)",
                val: muscleMass,
                set: setMuscleMass,
                placeholder: "28.0",
              },
              {
                label: "Fat Mass (kg)",
                val: fatMass,
                set: setFatMass,
                placeholder: "13.0",
              },
              {
                label: "Visceral Fat",
                val: visceralFat,
                set: setVisceralFat,
                placeholder: "5",
              },
              {
                label: "Body Water (L)",
                val: totalBodyWater,
                set: setTotalBodyWater,
                placeholder: "36.3",
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
            <Btn variant="primary" onClick={saveEntry} disabled={saving}>
              {saving
                ? "Saving…"
                : extractedPending
                  ? "✅ Confirm & Save"
                  : "Save Assessment"}
            </Btn>
            {inbodyHistory.length > 0 && (
              <Btn variant="ghost" onClick={() => setPage("Progress")}>
                📈 Progress Report
              </Btn>
            )}
          </div>
        </div>

        {/* ── File upload ───────────────────────────────────────────────── */}
        <div className="mk2-card flex flex-col">
          <div className="font-bold text-sm mb-2">Upload InBody Report</div>
          <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Upload your InBody printout (photo or PDF). We'll automatically
            extract your metrics — you'll be asked to confirm the values before
            saving.
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
                  JPG, PNG or PDF — values auto-extracted for review
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
          {/* ✅ Updated hint — tells user what happens after upload */}
          <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 leading-relaxed">
            ℹ️ After upload, values are pre-filled on the left.{" "}
            <strong className="text-foreground">
              Always check them against your printout
            </strong>{" "}
            — AI can occasionally misread numbers. Correct anything wrong, then
            press <strong className="text-foreground">Confirm & Save</strong>.
          </div>
        </div>
      </div>

      {/* ── AI error banner ────────────────────────────────────────────── */}
      {aiError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {aiError}
        </div>
      )}

      {/* ── History ────────────────────────────────────────────────────── */}
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
                      disabled={outOfCredits}
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

      {/* ── About InBody ──────────────────────────────────────────────── */}
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

