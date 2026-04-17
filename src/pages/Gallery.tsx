import { useState, useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Tag } from "@/components/shared/Tag";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Elfsight Instagram widget ID ─────────────────────────────────────────────
const ELFSIGHT_APP_ID = "elfsight-app-634db65e-6224-4128-ade4-41d236a25823";

// ── Instagram Feed section (Elfsight embed) ───────────────────────────────────
function InstagramFeed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load or re-trigger the Elfsight platform script
    const existingScript = document.getElementById("elfsight-platform");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "elfsight-platform";
      script.src = "https://elfsightcdn.com/platform.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      // Script already loaded — tell Elfsight to re-init any new widgets
      // @ts-ignore
      if (window.eapps?.platform) {
        // @ts-ignore
        window.eapps.platform.reload?.();
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={ELFSIGHT_APP_ID}
      data-elfsight-app-lazy
      style={{ minHeight: 300 }}
    />
  );
}

// ── Fallback gallery data ─────────────────────────────────────────────────────
const FALLBACK_GALLERY = [
  {
    id: "1",
    label: "HIIT Session",
    category: "Classes",
    emoji: "🔥",
    accent: "hsl(0 84% 51%)",
    desc: "Coach Sipho leading Monday HIIT — 06:00 crew never misses",
  },
  {
    id: "2",
    label: "Weight Room",
    category: "Facilities",
    emoji: "🏋️",
    accent: "hsl(217 91% 53%)",
    desc: "Fully equipped free weights & rack zone",
  },
  {
    id: "3",
    label: "Transformation",
    category: "Members",
    emoji: "💪",
    accent: "hsl(142 72% 37%)",
    desc: "Thabo — 6 months, -14kg, +8kg muscle",
  },
  {
    id: "4",
    label: "Boxing Corner",
    category: "Classes",
    emoji: "🥊",
    accent: "hsl(20 100% 50%)",
    desc: "Coach Dlamini running evening boxing fit",
  },
  {
    id: "5",
    label: "Spin Studio",
    category: "Facilities",
    emoji: "🚴",
    accent: "hsl(217 91% 53%)",
    desc: "20-bike spin studio with immersive sound",
  },
  {
    id: "6",
    label: "Community Day",
    category: "Events",
    emoji: "🎉",
    accent: "hsl(142 72% 37%)",
    desc: "MK2 Family Day — 200+ members attended",
  },
  {
    id: "7",
    label: "CrossFit WOD",
    category: "Classes",
    emoji: "⚡",
    accent: "hsl(38 92% 44%)",
    desc: "Saturday WOD — top 3 get free month!",
  },
  {
    id: "8",
    label: "Recovery Zone",
    category: "Facilities",
    emoji: "🛁",
    accent: "hsl(263 85% 58%)",
    desc: "Ice bath, sauna & stretch zone",
  },
];

const CAT_COLORS: Record<string, string> = {
  Classes: "hsl(20 100% 50%)",
  Facilities: "hsl(217 91% 53%)",
  Members: "hsl(142 72% 37%)",
  Events: "hsl(38 92% 44%)",
  Transformation: "hsl(263 85% 58%)",
};

const CATS = [
  "All",
  "Classes",
  "Facilities",
  "Members",
  "Events",
  "Transformation",
];

// ── Gallery view (admin items + fallback) ─────────────────────────────────────
type GalleryView = "instagram" | "photos";

export function Gallery() {
  const { isMobile } = useBreakpoint();
  const [view, setView] = useState<GalleryView>("instagram");
  const [cat, setCat] = useState("All");
  const [adminGallery, setAdminGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const galleryRef = ref(db, "admin_gallery");
    const unsub = onValue(galleryRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          accent: val.accent || CAT_COLORS[val.category] || "hsl(20 100% 50%)",
        }));
        setAdminGallery(list);
      } else {
        setAdminGallery([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const GALLERY = adminGallery.length > 0 ? adminGallery : FALLBACK_GALLERY;
  const filtered =
    cat === "All" ? GALLERY : GALLERY.filter((g) => g.category === cat);

  return (
    <div
      className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <PageTitle sub="Life at MK Two Rivers — follow us on Instagram">
        Gallery
      </PageTitle>

      {/* View switcher */}
      <div className="flex bg-secondary rounded-lg p-1 gap-1 mb-6 w-fit">
        <button
          onClick={() => setView("instagram")}
          className="py-2 px-4 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150"
          style={{
            background:
              view === "instagram" ? "hsl(20 100% 50%)" : "transparent",
            color:
              view === "instagram" ? "#000" : "hsl(var(--muted-foreground))",
          }}
        >
          📸 Instagram
        </button>
        <button
          onClick={() => setView("photos")}
          className="py-2 px-4 rounded-md border-none cursor-pointer font-body font-bold text-xs uppercase tracking-wide transition-all duration-150"
          style={{
            background: view === "photos" ? "hsl(20 100% 50%)" : "transparent",
            color: view === "photos" ? "#000" : "hsl(var(--muted-foreground))",
          }}
        >
          🏋️ Highlights
        </button>
      </div>

      {/* ── Instagram Feed (Elfsight) ──────────────────────────────────── */}
      {view === "instagram" && (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold">@mk2riversfitness</span>
            <span className="text-xs text-muted-foreground">
              · Latest posts
            </span>
          </div>
          <InstagramFeed />
        </div>
      )}

      {/* ── Photo Highlights (admin + fallback grid) ───────────────────── */}
      {view === "photos" && (
        <>
          {!loading && adminGallery.length > 0 && (
            <div className="mb-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Live gallery from admin ({adminGallery.length} items)
            </div>
          )}

          <div className="flex gap-2 mb-6 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-1.5 border rounded-full font-body font-bold text-[11px] uppercase cursor-pointer transition-all duration-150 ${
                  c === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Loading gallery…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No items in this category yet.
            </div>
          ) : (
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
                  {g.imageUrl ? (
                    <div className="h-[140px] overflow-hidden">
                      <img
                        src={g.imageUrl}
                        alt={g.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-[140px] flex items-center justify-center text-[56px] relative"
                      style={{
                        background: `linear-gradient(135deg, hsl(var(--background)), ${g.accent}22)`,
                      }}
                    >
                      <span className="group-hover:scale-110 transition-transform duration-300">
                        {g.emoji}
                      </span>
                      <div className="absolute top-2.5 right-2.5">
                        <Tag color={g.accent}>{g.category}</Tag>
                      </div>
                    </div>
                  )}
                  <div className="p-3.5 bg-card">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-display text-lg tracking-wide leading-tight">
                        {g.label}
                      </div>
                      {g.imageUrl && <Tag color={g.accent}>{g.category}</Tag>}
                    </div>
                    {g.desc && (
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {g.desc}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { Tag } from "@/components/shared/Tag";
// import { PageTitle } from "@/components/shared/PageTitle";
// import { motion } from "framer-motion";
// import { ref, onValue } from "firebase/database";
// import { db } from "@/lib/firebase";

// const FALLBACK_GALLERY = [
//   {
//     id: "1",
//     label: "HIIT Session",
//     category: "Classes",
//     emoji: "🔥",
//     accent: "hsl(0 84% 51%)",
//     desc: "Coach Sipho leading Monday HIIT — 06:00 crew never misses",
//   },
//   {
//     id: "2",
//     label: "Weight Room",
//     category: "Facilities",
//     emoji: "🏋️",
//     accent: "hsl(217 91% 53%)",
//     desc: "Fully equipped free weights & rack zone",
//   },
//   {
//     id: "3",
//     label: "Transformation",
//     category: "Members",
//     emoji: "💪",
//     accent: "hsl(142 72% 37%)",
//     desc: "Thabo — 6 months, -14kg, +8kg muscle",
//   },
//   {
//     id: "4",
//     label: "Boxing Corner",
//     category: "Classes",
//     emoji: "🥊",
//     accent: "hsl(20 100% 50%)",
//     desc: "Coach Dlamini running evening boxing fit",
//   },
//   {
//     id: "5",
//     label: "Spin Studio",
//     category: "Facilities",
//     emoji: "🚴",
//     accent: "hsl(217 91% 53%)",
//     desc: "20-bike spin studio with immersive sound",
//   },
//   {
//     id: "6",
//     label: "Community Day",
//     category: "Events",
//     emoji: "🎉",
//     accent: "hsl(142 72% 37%)",
//     desc: "MK2 Family Day — 200+ members attended",
//   },
//   {
//     id: "7",
//     label: "CrossFit WOD",
//     category: "Classes",
//     emoji: "⚡",
//     accent: "hsl(38 92% 44%)",
//     desc: "Saturday WOD — top 3 get free month!",
//   },
//   {
//     id: "8",
//     label: "Recovery Zone",
//     category: "Facilities",
//     emoji: "🛁",
//     accent: "hsl(263 85% 58%)",
//     desc: "Ice bath, sauna & stretch zone",
//   },
// ];

// // Map category to accent colour for admin-added items
// const CAT_COLORS: Record<string, string> = {
//   Classes: "hsl(20 100% 50%)",
//   Facilities: "hsl(217 91% 53%)",
//   Members: "hsl(142 72% 37%)",
//   Events: "hsl(38 92% 44%)",
//   Transformation: "hsl(263 85% 58%)",
// };

// const CATS = [
//   "All",
//   "Classes",
//   "Facilities",
//   "Members",
//   "Events",
//   "Transformation",
// ];

// export function Gallery() {
//   const { isMobile } = useBreakpoint();
//   const [cat, setCat] = useState("All");
//   const [adminGallery, setAdminGallery] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const galleryRef = ref(db, "admin_gallery");
//     const unsub = onValue(galleryRef, (snap) => {
//       if (snap.exists()) {
//         const data = snap.val();
//         const list = Object.entries(data).map(([id, val]: [string, any]) => ({
//           id,
//           ...val,
//           // ensure accent colour exists
//           accent: val.accent || CAT_COLORS[val.category] || "hsl(20 100% 50%)",
//         }));
//         setAdminGallery(list);
//       } else {
//         setAdminGallery([]);
//       }
//       setLoading(false);
//     });
//     return () => unsub();
//   }, []);

//   const GALLERY = adminGallery.length > 0 ? adminGallery : FALLBACK_GALLERY;
//   const filtered =
//     cat === "All" ? GALLERY : GALLERY.filter((g) => g.category === cat);

//   return (
//     <div
//       className={`max-w-[1060px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
//     >
//       <PageTitle sub="Life at MK Two Rivers — classes, facilities & member moments">
//         Gallery
//       </PageTitle>

//       {/* Admin source indicator */}
//       {!loading && adminGallery.length > 0 && (
//         <div className="mb-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
//           <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
//           Live gallery from admin ({adminGallery.length} items)
//         </div>
//       )}

//       {/* Category filters */}
//       <div className="flex gap-2 mb-6 flex-wrap">
//         {CATS.map((c) => (
//           <button
//             key={c}
//             onClick={() => setCat(c)}
//             className={`px-4 py-1.5 border rounded-full font-body font-bold text-[11px] uppercase cursor-pointer transition-all duration-150 ${
//               c === cat
//                 ? "bg-primary text-primary-foreground border-primary"
//                 : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
//             }`}
//           >
//             {c}
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           Loading gallery…
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="text-center py-12 text-muted-foreground text-sm">
//           No items in this category yet.
//         </div>
//       ) : (
//         <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
//           {filtered.map((g, i) => (
//             <motion.div
//               key={g.id}
//               initial={{ opacity: 0, scale: 0.96 }}
//               animate={{ opacity: 1, scale: 1 }}
//               transition={{ delay: i * 0.05 }}
//               className="rounded-xl overflow-hidden border hover:border-opacity-60 transition-all duration-200 group"
//               style={{ borderColor: `${g.accent}33` }}
//             >
//               {/* Image or emoji */}
//               {g.imageUrl ? (
//                 <div className="h-[140px] overflow-hidden">
//                   <img
//                     src={g.imageUrl}
//                     alt={g.label}
//                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
//                   />
//                 </div>
//               ) : (
//                 <div
//                   className="h-[140px] flex items-center justify-center text-[56px] relative"
//                   style={{
//                     background: `linear-gradient(135deg, hsl(var(--background)), ${g.accent}22)`,
//                   }}
//                 >
//                   <span className="group-hover:scale-110 transition-transform duration-300">
//                     {g.emoji}
//                   </span>
//                   <div className="absolute top-2.5 right-2.5">
//                     <Tag color={g.accent}>{g.category}</Tag>
//                   </div>
//                 </div>
//               )}
//               <div className="p-3.5 bg-card">
//                 <div className="flex items-start justify-between gap-2 mb-1">
//                   <div className="font-display text-lg tracking-wide leading-tight">
//                     {g.label}
//                   </div>
//                   {g.imageUrl && <Tag color={g.accent}>{g.category}</Tag>}
//                 </div>
//                 {g.desc && (
//                   <div className="text-xs text-muted-foreground leading-relaxed">
//                     {g.desc}
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
