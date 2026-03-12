import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";

const NEWS = [
  { id: 1, type: "Event", title: "30-Day Transformation Challenge", date: "1 Apr 2026", desc: "Sign up for our biggest challenge. Track daily, earn double points, compete for 3-month free membership.", color: "hsl(20 100% 50%)", emoji: "🏆" },
  { id: 2, type: "News", title: "New Spin Studio Opens", date: "20 Mar 2026", desc: "Upgraded with 5 Technogym bikes, surround-sound, and a light show. Tuesday noon now fully booked.", color: "hsl(217 91% 53%)", emoji: "🚴" },
  { id: 3, type: "Event", title: "Charity Fun Run — 5km & 10km", date: "12 Apr 2026", desc: "Umgeni River Run raising funds for Riverside Youth Sports Trust. R80 entry includes race kit.", color: "hsl(142 72% 37%)", emoji: "🏃" },
  { id: 4, type: "News", title: "Coach Dlamini — SA Boxing Finals", date: "8 Mar 2026", desc: "Coach Dlamini placed 2nd at SA Amateur Boxing Championships in Cape Town. Celebrate with him Saturday!", color: "hsl(38 92% 44%)", emoji: "🥊" },
  { id: 5, type: "News", title: "Recovery Zone Now Open", date: "1 Mar 2026", desc: "Ice bath, sauna & stretch zone open. Members get 1 free session/week. Extra sessions R50.", color: "hsl(263 85% 58%)", emoji: "🛁" },
  { id: 6, type: "Event", title: "MK2 Family Day — April Braai", date: "26 Apr 2026", desc: "Bring the whole family! Kids fitness activities, live music, and the famous MK2 braai. RSVP by 20 April.", color: "hsl(20 100% 50%)", emoji: "🎉" },
];

export function NewsEvents() {
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? NEWS : NEWS.filter((n) => n.type === filter);

  return (
    <div className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}>
      <PageTitle sub="What's happening at MK2 Rivers Fitness">
        News & <span className="text-primary">Events</span>
      </PageTitle>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", "News", "Event"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 border rounded-full font-body font-bold text-[11px] uppercase cursor-pointer transition-all duration-150 ${
              f === filter ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
        {filtered.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="mk2-card"
            style={{ borderTop: `3px solid ${n.color}` }}
          >
            <div className="flex justify-between items-start mb-2">
              <Tag color={n.color}>{n.type}</Tag>
              <span className="text-[28px]">{n.emoji}</span>
            </div>
            <div className="font-display text-lg tracking-wide mb-1">{n.title}</div>
            <div className="text-[11px] font-bold tracking-[0.06em] mb-2" style={{ color: n.color }}>{n.date}</div>
            <div className="text-sm text-muted-foreground leading-relaxed mb-3.5">{n.desc}</div>
            <button
              className="bg-transparent border rounded-md px-3.5 py-1.5 text-[11px] font-bold font-body cursor-pointer uppercase tracking-wide hover:bg-white/5 transition-colors"
              style={{ borderColor: n.color, color: n.color }}
            >
              Learn More
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
