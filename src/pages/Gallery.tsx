import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const GALLERY = [
  { id: 1, label: "HIIT Session", category: "Classes", emoji: "🔥", accent: "hsl(0 84% 51%)", desc: "Coach Sipho leading Monday HIIT — 06:00 crew never misses" },
  { id: 2, label: "Weight Room", category: "Facilities", emoji: "🏋️", accent: "hsl(217 91% 53%)", desc: "Fully equipped free weights & rack zone" },
  { id: 3, label: "Yoga Studio", category: "Facilities", emoji: "🧘", accent: "hsl(263 85% 58%)", desc: "Dedicated studio with natural light — morning flows" },
  { id: 4, label: "Transformation", category: "Members", emoji: "💪", accent: "hsl(142 72% 37%)", desc: "Thabo — 6 months, -14kg, +8kg muscle" },
  { id: 5, label: "Boxing Corner", category: "Classes", emoji: "🥊", accent: "hsl(20 100% 50%)", desc: "Coach Dlamini running evening boxing fit" },
  { id: 6, label: "Spin Studio", category: "Facilities", emoji: "🚴", accent: "hsl(217 91% 53%)", desc: "20-bike spin studio with immersive sound" },
  { id: 7, label: "Community Day", category: "Events", emoji: "🎉", accent: "hsl(142 72% 37%)", desc: "MK2 Family Day — 200+ members attended" },
  { id: 8, label: "CrossFit WOD", category: "Classes", emoji: "⚡", accent: "hsl(38 92% 44%)", desc: "Saturday WOD — top 3 get free month!" },
  { id: 9, label: "Recovery Zone", category: "Facilities", emoji: "🛁", accent: "hsl(263 85% 58%)", desc: "Ice bath, sauna & stretch zone" },
];

export function Gallery() {
  const { isMobile } = useBreakpoint();
  const [cat, setCat] = useState("All");
  const filtered = cat === "All" ? GALLERY : GALLERY.filter((g) => g.category === cat);

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="Life at MK2 Rivers — classes, facilities & member moments">Gallery</PageTitle>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", "Classes", "Facilities", "Members", "Events"].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 border rounded-full font-body font-bold text-[11px] uppercase cursor-pointer transition-all duration-150 ${
              c === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
        {filtered.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl overflow-hidden border hover:border-opacity-60 transition-all duration-200 group"
            style={{ borderColor: `${g.accent}33` }}
          >
            <div
              className="h-[140px] flex items-center justify-center text-[56px] relative"
              style={{ background: `linear-gradient(135deg, hsl(var(--background)), ${g.accent}22)` }}
            >
              <span className="group-hover:scale-110 transition-transform duration-300">{g.emoji}</span>
              <Tag color={g.accent} className="absolute top-2.5 right-2.5">{g.category}</Tag>
            </div>
            <div className="p-3.5 bg-card">
              <div className="font-display text-lg tracking-wide mb-1">{g.label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{g.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
