import { useState, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  type: string;
  title: string;
  date: string;
  desc?: string;
  emoji?: string;
  imageUrl?: string;
  registrationLink?: string;
  registrationCutoff?: string;
  paymentLink?: string;
}

// ── Fallback data (no imageUrl / event fields — kept for offline dev) ────────

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "1",
    type: "Event",
    title: "30-Day Transformation Challenge",
    date: "2026-04-01",
    desc: "Sign up for our biggest challenge. Track daily, earn double points, compete for 3-month free membership.",
    emoji: "🏆",
    registrationLink: "",
    registrationCutoff: "",
    paymentLink: "",
  },
  {
    id: "2",
    type: "News",
    title: "New Spin Studio Opens",
    date: "2026-03-20",
    desc: "Upgraded with 5 Technogym bikes, surround-sound, and a light show. Tuesday noon now fully booked.",
    emoji: "🚴",
  },
  {
    id: "3",
    type: "Event",
    title: "Charity Fun Run — 5km & 10km",
    date: "2026-04-12",
    desc: "Umgeni River Run raising funds for Riverside Youth Sports Trust. R80 entry includes race kit.",
    emoji: "🏃",
    registrationLink: "https://forms.gle/example",
    registrationCutoff: "2026-04-05",
    paymentLink: "https://payfast.io/example",
  },
  {
    id: "4",
    type: "News",
    title: "Coach Dlamini — SA Boxing Finals",
    date: "2026-03-08",
    desc: "Coach Dlamini placed 2nd at SA Amateur Boxing Championships in Cape Town. Celebrate with him Saturday!",
    emoji: "🥊",
  },
  {
    id: "5",
    type: "News",
    title: "Recovery Zone Now Open",
    date: "2026-03-01",
    desc: "Ice bath, sauna & stretch zone open. Members get 1 free session/week. Extra sessions R50.",
    emoji: "🛁",
  },
  {
    id: "6",
    type: "Event",
    title: "MK2 Family Day — April Braai",
    date: "2026-04-26",
    desc: "Bring the whole family! Kids fitness activities, live music, and the famous MK2 braai.",
    emoji: "🎉",
    registrationLink: "",
    registrationCutoff: "2026-04-20",
    paymentLink: "",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format "2026-04-12" → "12 Apr 2026" */
function formatDate(raw: string): string {
  if (!raw) return "";
  // Already formatted (e.g. fallback strings like "1 Apr 2026")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const [y, m, d] = raw.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

/** Returns true if the cutoff date has already passed */
function isCutoffPassed(cutoff: string): boolean {
  if (!cutoff) return false;
  return new Date(cutoff) < new Date();
}

function typeBadgeStyle(type: string): React.CSSProperties {
  const isEvent = type === "Event";
  return {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    padding: "3px 10px",
    borderRadius: 20,
    background: isEvent ? "hsl(20 100% 50% / 0.12)" : "hsl(0 0% 100% / 0.07)",
    color: isEvent ? "hsl(20 100% 50%)" : "hsl(0 0% 60%)",
    border: `1px solid ${isEvent ? "hsl(20 100% 50% / 0.25)" : "hsl(0 0% 20%)"}`,
  };
}

// ── NewsCard ─────────────────────────────────────────────────────────────────

function NewsCard({ n, index }: { n: NewsItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const SHORT_LIMIT = 100;
  const desc = n.desc ?? "";
  const isLong = desc.length > SHORT_LIMIT;
  const shortDesc = isLong ? desc.slice(0, SHORT_LIMIT).trimEnd() + "…" : desc;

  const formattedDate = formatDate(n.date);
  const formattedCutoff = n.registrationCutoff
    ? formatDate(n.registrationCutoff)
    : null;
  const cutoffPassed = isCutoffPassed(n.registrationCutoff ?? "");

  const hasRegistration = !!n.registrationLink;
  const hasPayment = !!n.paymentLink;
  const isEvent = n.type === "Event";

  return (
    <motion.div
      key={n.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="mk2-card flex flex-col overflow-hidden"
      style={{ borderTop: "3px solid hsl(20 100% 50%)", padding: 0 }}
    >
      {/* ── Hero image ──────────────────────────────────────────────────── */}
      {n.imageUrl && (
        <div className="w-full overflow-hidden" style={{ height: 160 }}>
          <img
            src={n.imageUrl}
            alt={n.title}
            className="w-full h-full object-cover"
            style={{ display: "block" }}
          />
        </div>
      )}

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Header row: badge + emoji (emoji only for fallback items) */}
        <div className="flex justify-between items-start mb-3">
          <span style={typeBadgeStyle(n.type)}>{n.type}</span>
          {n.emoji && (
            <span className="text-[22px] leading-none">{n.emoji}</span>
          )}
        </div>

        {/* Title */}
        <div className="font-display text-lg tracking-wide mb-1 text-foreground">
          {n.title}
        </div>

        {/* Event date */}
        <div className="text-[11px] font-bold tracking-[0.06em] mb-2 text-primary">
          {formattedDate}
        </div>

        {/* Registration cutoff pill (events only) */}
        {isEvent && formattedCutoff && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: cutoffPassed
                  ? "hsl(0 72% 50% / 0.12)"
                  : "hsl(142 72% 37% / 0.10)",
                color: cutoffPassed
                  ? "hsl(0 72% 55%)"
                  : "hsl(142 72% 37%)",
                border: `1px solid ${cutoffPassed ? "hsl(0 72% 50% / 0.25)" : "hsl(142 72% 37% / 0.25)"}`,
              }}
            >
              {cutoffPassed ? "⏰" : "📅"}
              {cutoffPassed
                ? `Registration closed ${formattedCutoff}`
                : `Register by ${formattedCutoff}`}
            </span>
          </div>
        )}

        {/* Description */}
        {desc && (
          <div className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">
            <AnimatePresence mode="wait">
              {expanded ? (
                <motion.span
                  key="full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {desc}
                </motion.span>
              ) : (
                <motion.span
                  key="short"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {shortDesc}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Learn More / Show Less */}
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="self-start bg-transparent border border-primary text-primary rounded-md px-3.5 py-1.5 text-[11px] font-bold font-body cursor-pointer uppercase tracking-wide hover:bg-primary/5 transition-colors mb-3"
          >
            {expanded ? "Show Less ↑" : "Learn More ↓"}
          </button>
        )}

        {/* ── CTA buttons ─────────────────────────────────────────────── */}
        {isEvent && (hasRegistration || hasPayment) && (
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            {hasRegistration && (
              <a
                href={n.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-bold font-body uppercase tracking-wide transition-colors"
                style={{
                  background: cutoffPassed
                    ? "hsl(0 0% 20%)"
                    : "hsl(20 100% 50%)",
                  color: cutoffPassed ? "hsl(0 0% 45%)" : "#000",
                  pointerEvents: cutoffPassed ? "none" : "auto",
                  cursor: cutoffPassed ? "not-allowed" : "pointer",
                  opacity: cutoffPassed ? 0.6 : 1,
                }}
                aria-disabled={cutoffPassed}
                tabIndex={cutoffPassed ? -1 : 0}
              >
                🎟 {cutoffPassed ? "Closed" : "Register"}
              </a>
            )}
            {hasPayment && (
              <a
                href={n.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-bold font-body uppercase tracking-wide border transition-colors hover:bg-white/5"
                style={{
                  border: "1px solid hsl(217 91% 53% / 0.5)",
                  color: "hsl(217 91% 65%)",
                }}
              >
                💳 Pay Now
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function NewsEvents() {
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState("All");
  const [adminNews, setAdminNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const newsRef = ref(db, "admin_news");
    const unsub = onValue(newsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: NewsItem[] = Object.entries(data).map(
          ([id, val]: [string, any]) => ({ id, ...val })
        );
        // Newest first (by createdAt if present, otherwise reverse insertion order)
        list.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setAdminNews(list);
      } else {
        setAdminNews([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const NEWS = adminNews.length > 0 ? adminNews : FALLBACK_NEWS;
  const filters = ["All", ...Array.from(new Set(NEWS.map((n) => n.type)))];
  const filtered =
    filter === "All" ? NEWS : NEWS.filter((n) => n.type === filter);

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="What's happening at MK Two Rivers Fitness">
        News &amp; <span className="text-primary">Events</span>
      </PageTitle>

      {/* Live indicator */}
      {!loading && adminNews.length > 0 && (
        <div className="mb-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Live updates from admin ({adminNews.length} posts)
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer transition-all duration-150"
            style={{
              background: f === filter ? "hsl(20 100% 50%)" : "transparent",
              color: f === filter ? "#000" : "hsl(0 0% 50%)",
              border:
                f === filter
                  ? "1px solid hsl(20 100% 50%)"
                  : "1px solid hsl(0 0% 18%)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading news…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posts yet.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {filtered.map((n, i) => (
            <NewsCard key={n.id} n={n} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion, AnimatePresence } from "framer-motion";
// import { ref, onValue } from "firebase/database";
// import { db } from "@/lib/firebase";

// const FALLBACK_NEWS = [
//   {
//     id: "1",
//     type: "Event",
//     title: "30-Day Transformation Challenge",
//     date: "1 Apr 2026",
//     desc: "Sign up for our biggest challenge. Track daily, earn double points, compete for 3-month free membership.",
//     emoji: "🏆",
//   },
//   {
//     id: "2",
//     type: "News",
//     title: "New Spin Studio Opens",
//     date: "20 Mar 2026",
//     desc: "Upgraded with 5 Technogym bikes, surround-sound, and a light show. Tuesday noon now fully booked.",
//     emoji: "🚴",
//   },
//   {
//     id: "3",
//     type: "Event",
//     title: "Charity Fun Run — 5km & 10km",
//     date: "12 Apr 2026",
//     desc: "Umgeni River Run raising funds for Riverside Youth Sports Trust. R80 entry includes race kit.",
//     emoji: "🏃",
//   },
//   {
//     id: "4",
//     type: "News",
//     title: "Coach Dlamini — SA Boxing Finals",
//     date: "8 Mar 2026",
//     desc: "Coach Dlamini placed 2nd at SA Amateur Boxing Championships in Cape Town. Celebrate with him Saturday!",
//     emoji: "🥊",
//   },
//   {
//     id: "5",
//     type: "News",
//     title: "Recovery Zone Now Open",
//     date: "1 Mar 2026",
//     desc: "Ice bath, sauna & stretch zone open. Members get 1 free session/week. Extra sessions R50.",
//     emoji: "🛁",
//   },
//   {
//     id: "6",
//     type: "Event",
//     title: "MK2 Family Day — April Braai",
//     date: "26 Apr 2026",
//     desc: "Bring the whole family! Kids fitness activities, live music, and the famous MK2 braai. RSVP by 20 April.",
//     emoji: "🎉",
//   },
// ];

// function typeBadgeStyle(type: string): React.CSSProperties {
//   const isEvent = type === "Event";
//   return {
//     display: "inline-block",
//     fontSize: 10,
//     fontWeight: 700,
//     letterSpacing: "0.07em",
//     textTransform: "uppercase" as const,
//     padding: "3px 10px",
//     borderRadius: 20,
//     background: isEvent ? "hsl(20 100% 50% / 0.12)" : "hsl(0 0% 100% / 0.07)",
//     color: isEvent ? "hsl(20 100% 50%)" : "hsl(0 0% 60%)",
//     border: `1px solid ${isEvent ? "hsl(20 100% 50% / 0.25)" : "hsl(0 0% 20%)"}`,
//   };
// }

// function NewsCard({ n, index }: { n: any; index: number }) {
//   const [expanded, setExpanded] = useState(false);

//   // Truncate description to ~80 chars for collapsed state
//   const SHORT_LIMIT = 80;
//   const isLong = (n.desc ?? "").length > SHORT_LIMIT;
//   const shortDesc = isLong
//     ? n.desc.slice(0, SHORT_LIMIT).trimEnd() + "…"
//     : n.desc;

//   return (
//     <motion.div
//       key={n.id}
//       initial={{ opacity: 0, y: 10 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: index * 0.06 }}
//       className="mk2-card flex flex-col"
//       style={{ borderTop: "3px solid hsl(20 100% 50%)" }}
//     >
//       {/* Header row */}
//       <div className="flex justify-between items-start mb-3">
//         <span style={typeBadgeStyle(n.type)}>{n.type}</span>
//         <span className="text-[24px] leading-none">{n.emoji}</span>
//       </div>

//       {/* Title */}
//       <div className="font-display text-lg tracking-wide mb-1 text-foreground">
//         {n.title}
//       </div>

//       {/* Date */}
//       <div className="text-[11px] font-bold tracking-[0.06em] mb-2 text-primary">
//         {n.date}
//       </div>

//       {/* Description — collapsed or expanded */}
//       <div className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
//         <AnimatePresence mode="wait">
//           {expanded ? (
//             <motion.span
//               key="full"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.2 }}
//             >
//               {n.desc}
//             </motion.span>
//           ) : (
//             <motion.span
//               key="short"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.2 }}
//             >
//               {shortDesc}
//             </motion.span>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* Learn More / Show Less — only shown if description is long enough */}
//       {isLong && (
//         <button
//           onClick={() => setExpanded((v) => !v)}
//           className="self-start bg-transparent border border-primary text-primary rounded-md px-3.5 py-1.5 text-[11px] font-bold font-body cursor-pointer uppercase tracking-wide hover:bg-primary/5 transition-colors"
//         >
//           {expanded ? "Show Less ↑" : "Learn More ↓"}
//         </button>
//       )}
//     </motion.div>
//   );
// }

// export function NewsEvents() {
//   const { isMobile } = useBreakpoint();
//   const [filter, setFilter] = useState("All");
//   const [adminNews, setAdminNews] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const newsRef = ref(db, "admin_news");
//     const unsub = onValue(newsRef, (snap) => {
//       if (snap.exists()) {
//         const data = snap.val();
//         const list = Object.entries(data).map(([id, val]: [string, any]) => ({
//           id,
//           ...val,
//         }));
//         list.reverse();
//         setAdminNews(list);
//       } else {
//         setAdminNews([]);
//       }
//       setLoading(false);
//     });
//     return () => unsub();
//   }, []);

//   const NEWS = adminNews.length > 0 ? adminNews : FALLBACK_NEWS;
//   const filters = ["All", ...Array.from(new Set(NEWS.map((n) => n.type)))];
//   const filtered =
//     filter === "All" ? NEWS : NEWS.filter((n) => n.type === filter);

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="What's happening at MK Two Rivers Fitness">
//         News &amp; <span className="text-primary">Events</span>
//       </PageTitle>

//       {/* Live indicator */}
//       {!loading && adminNews.length > 0 && (
//         <div className="mb-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
//           <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
//           Live updates from admin ({adminNews.length} posts)
//         </div>
//       )}

//       {/* Filter tabs */}
//       <div className="flex gap-2 mb-6 flex-wrap">
//         {filters.map((f) => (
//           <button
//             key={f}
//             onClick={() => setFilter(f)}
//             className="px-4 py-1.5 rounded-full font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer transition-all duration-150"
//             style={{
//               background: f === filter ? "hsl(20 100% 50%)" : "transparent",
//               color: f === filter ? "#000" : "hsl(0 0% 50%)",
//               border:
//                 f === filter
//                   ? "1px solid hsl(20 100% 50%)"
//                   : "1px solid hsl(0 0% 18%)",
//             }}
//           >
//             {f}
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           Loading news…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           No posts yet.
//         </div>
//       ) : (
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
//           {filtered.map((n, i) => (
//             <NewsCard key={n.id} n={n} index={i} />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


