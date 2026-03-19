import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { askClaude } from "@/lib/claude";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

interface InBodyEntry {
  date: number;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  bmi: number;
  visceralFat: number;
  totalBodyWater: number;
  notes: string;
  hasFile: boolean;
}

export function InBody() {
  const { user, updateUser, toast } = useAuth();
  const { isMobile } = useBreakpoint();
  const fileRef = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [bmi, setBmi] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [totalBodyWater, setTotalBodyWater] = useState("");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);

  if (!user) return null;

  const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const saveEntry = async () => {
    if (!weight) return toast("Enter at least your weight", "error");
    const entry: InBodyEntry = {
      date: Date.now(),
      weight: parseFloat(weight),
      bodyFat: parseFloat(bodyFat) || 0,
      muscleMass: parseFloat(muscleMass) || 0,
      bmi: parseFloat(bmi) || 0,
      visceralFat: parseFloat(visceralFat) || 0,
      totalBodyWater: parseFloat(totalBodyWater) || 0,
      notes,
      hasFile: !!fileName,
    };
    const updated = {
      ...user,
      inbodyHistory: [entry, ...inbodyHistory],
    } as any;
    await updateUser(updated);
    toast("InBody results saved ✓", "success");
    setWeight("");
    setBodyFat("");
    setMuscleMass("");
    setBmi("");
    setVisceralFat("");
    setTotalBodyWater("");
    setNotes("");
    setFileName(null);
  };

  const analyseEntry = async (entry: InBodyEntry) => {
    setActiveEntry(entry);
    setAnalysing(true);
    setAnalysis("");
    const prev = inbodyHistory.find((e) => e.date !== entry.date);
    try {
      await askClaude(
        `You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.`,
        `Analyse this InBody for ${user.name}, Goal: "${user.goal}", Level: ${user.level}:
Weight: ${entry.weight}kg | Body Fat: ${entry.bodyFat}% | Muscle Mass: ${entry.muscleMass}kg
BMI: ${entry.bmi} | Visceral Fat: ${entry.visceralFat} | Body Water: ${entry.totalBodyWater}L
${prev ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg` : "First assessment."}
Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`,
        setAnalysis,
      );
    } catch {
      setAnalysis(
        "AI analysis unavailable — add your API key to .env to enable this feature.",
      );
    }
    setAnalysing(false);
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

      <div
        className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"} mb-6`}
      >
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
              { label: "BMI", val: bmi, set: setBmi, placeholder: "24.1" },
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
          <Btn variant="primary" onClick={saveEntry}>
            Save Assessment
          </Btn>
        </div>

        <div className="mk2-card flex flex-col">
          <div className="font-bold text-sm mb-2">Upload InBody Report</div>
          <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Scan or photograph your InBody printout. The gym reception can email
            you a digital copy after your assessment.
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors min-h-[140px]"
          >
            {fileName ? (
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
                  JPG, PNG or PDF
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
          />
          <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
            ℹ️ Fill in the numbers above to save your results to your profile
            history.
          </div>
        </div>
      </div>

      {inbodyHistory.length > 0 && (
        <div className="mk2-card mb-5">
          <div className="font-bold text-sm mb-4">
            Assessment History ({inbodyHistory.length})
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
                  </div>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => analyseEntry(entry)}
                  >
                    🤖 AI Analyse
                  </Btn>
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
                      label: "BMI",
                      value: entry.bmi || "—",
                      color: "hsl(217 91% 53%)",
                    },
                    {
                      label: "Visceral",
                      value: entry.visceralFat || "—",
                      color: "hsl(38 92% 44%)",
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
            {
              icon: "🦴",
              label: "Bone Mineral Content",
              color: "hsl(263 85% 58%)",
            },
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
            — a medical-grade scanner that goes far beyond just weight. The
            60-second scan sends a safe, low-level electrical signal through
            your body to precisely measure muscle, fat, and water distribution
            across each body segment.
          </p>
          <p>
            <strong className="text-foreground">How to scan:</strong> Visit
            reception at MK2R Ruimsig (29 Peter Rd, Tres Jolie AH, Roodepoort).
            The scan takes 60 seconds — stand barefoot on the platform and hold
            the handles. Results print immediately.
          </p>
          <p>
            <strong className="text-foreground">Best results tip:</strong> Scan
            first thing in the morning, before eating or training, after using
            the bathroom. Avoid scanning after intense exercise, eating, or if
            dehydrated — this skews the readings.
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
              Ask a coach or front desk to assist with your scan. Upload your
              printed results below for your AI-powered analysis.
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
// import { askClaude } from "@/lib/claude";
// import { Btn } from "@/components/shared/Btn";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";

// interface InBodyEntry {
//   date: number;
//   weight: number;
//   bodyFat: number;
//   muscleMass: number;
//   bmi: number;
//   visceralFat: number;
//   totalBodyWater: number;
//   notes: string;
//   hasFile: boolean;
// }

// export function InBody() {
//   const { user, updateUser, toast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const fileRef = useRef<HTMLInputElement>(null);
//   const [weight, setWeight] = useState("");
//   const [bodyFat, setBodyFat] = useState("");
//   const [muscleMass, setMuscleMass] = useState("");
//   const [bmi, setBmi] = useState("");
//   const [visceralFat, setVisceralFat] = useState("");
//   const [totalBodyWater, setTotalBodyWater] = useState("");
//   const [notes, setNotes] = useState("");
//   const [fileName, setFileName] = useState<string | null>(null);
//   const [analysis, setAnalysis] = useState("");
//   const [analysing, setAnalysing] = useState(false);
//   const [activeEntry, setActiveEntry] = useState<InBodyEntry | null>(null);

//   if (!user) return null;

//   const inbodyHistory: InBodyEntry[] = (user as any).inbodyHistory || [];

//   const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) setFileName(file.name);
//   };

//   const saveEntry = async () => {
//     if (!weight) return toast("Enter at least your weight", "error");
//     const entry: InBodyEntry = {
//       date: Date.now(),
//       weight: parseFloat(weight),
//       bodyFat: parseFloat(bodyFat) || 0,
//       muscleMass: parseFloat(muscleMass) || 0,
//       bmi: parseFloat(bmi) || 0,
//       visceralFat: parseFloat(visceralFat) || 0,
//       totalBodyWater: parseFloat(totalBodyWater) || 0,
//       notes,
//       hasFile: !!fileName,
//     };
//     const updated = {
//       ...user,
//       inbodyHistory: [entry, ...inbodyHistory],
//     } as any;
//     await updateUser(updated);
//     toast("InBody results saved ✓", "success");
//     setWeight("");
//     setBodyFat("");
//     setMuscleMass("");
//     setBmi("");
//     setVisceralFat("");
//     setTotalBodyWater("");
//     setNotes("");
//     setFileName(null);
//   };

//   const analyseEntry = async (entry: InBodyEntry) => {
//     setActiveEntry(entry);
//     setAnalysing(true);
//     setAnalysis("");
//     const prev = inbodyHistory.find((e) => e.date !== entry.date);
//     try {
//       await askClaude(
//         `You are a professional fitness and body composition coach at MK2 Rivers Fitness. You ONLY answer questions about fitness, body composition, health, and training. Decline anything unrelated.`,
//         `Analyse this InBody for ${user.name}, Goal: "${user.goal}", Level: ${user.level}:
// Weight: ${entry.weight}kg | Body Fat: ${entry.bodyFat}% | Muscle Mass: ${entry.muscleMass}kg
// BMI: ${entry.bmi} | Visceral Fat: ${entry.visceralFat} | Body Water: ${entry.totalBodyWater}L
// ${prev ? `Previous: Weight ${prev.weight}kg | Fat ${prev.bodyFat}% | Muscle ${prev.muscleMass}kg` : "First assessment."}
// Provide: 1) Assessment 2) Progress vs previous 3) Focus areas for their goal 4) 3 training tips 5) 2 nutrition adjustments`,
//         setAnalysis,
//       );
//     } catch {
//       setAnalysis(
//         "AI analysis unavailable — add your API key to .env to enable this feature.",
//       );
//     }
//     setAnalysing(false);
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

//       <div
//         className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"} mb-6`}
//       >
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
//               { label: "BMI", val: bmi, set: setBmi, placeholder: "24.1" },
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
//           <Btn variant="primary" onClick={saveEntry}>
//             Save Assessment
//           </Btn>
//         </div>

//         <div className="mk2-card flex flex-col">
//           <div className="font-bold text-sm mb-2">Upload InBody Report</div>
//           <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
//             Scan or photograph your InBody printout. The gym reception can email
//             you a digital copy after your assessment.
//           </div>
//           <div
//             onClick={() => fileRef.current?.click()}
//             className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors min-h-[140px]"
//           >
//             {fileName ? (
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
//                   JPG, PNG or PDF
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
//           />
//           <div className="mt-3 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
//             ℹ️ Fill in the numbers above to save your results to your profile
//             history.
//           </div>
//         </div>
//       </div>

//       {inbodyHistory.length > 0 && (
//         <div className="mk2-card mb-5">
//           <div className="font-bold text-sm mb-4">
//             Assessment History ({inbodyHistory.length})
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
//                   </div>
//                   <Btn
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => analyseEntry(entry)}
//                   >
//                     🤖 AI Analyse
//                   </Btn>
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
//                       label: "BMI",
//                       value: entry.bmi || "—",
//                       color: "hsl(217 91% 53%)",
//                     },
//                     {
//                       label: "Visceral",
//                       value: entry.visceralFat || "—",
//                       color: "hsl(38 92% 44%)",
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

//       <div className="mk2-card bg-secondary/50">
//         <div className="font-bold text-sm mb-2">About InBody at MK2</div>
//         <div className="text-xs text-muted-foreground leading-relaxed">
//           InBody scans are available at reception. The scan takes 45 seconds and
//           measures weight, body fat %, skeletal muscle mass, visceral fat, and
//           body water. Enter your results here and the AI coach will give you a
//           personalised analysis.
//         </div>
//       </div>
//     </div>
//   );
// }
