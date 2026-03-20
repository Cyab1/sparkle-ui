import { type ReactNode, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Toast } from "@/components/shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

function ensureMaterialIcons() {
  if (typeof document === "undefined") return;
  if (document.getElementById("material-symbols")) return;
  const link = document.createElement("link");
  link.id = "material-symbols";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0";
  document.head.appendChild(link);
}
ensureMaterialIcons();

function MI({ icon, size = 22 }: { icon: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded"
      style={{ fontSize: size, lineHeight: 1, userSelect: "none" }}
    >
      {icon}
    </span>
  );
}

const NAV_GROUPS = [
  {
    label: "Main",
    tabs: [
      { id: "Dashboard", label: "Home" },
      { id: "Checkin", label: "Check-In" },
      { id: "Leaderboard", label: "Leaderboard" },
      { id: "Notifications", label: "Notifications" },
    ],
  },
  {
    label: "Tools",
    tabs: [
      { id: "Workout", label: "Workout" },
      { id: "Nutrition", label: "Nutrition" },
      { id: "InBody", label: "InBody" },
      { id: "BMR", label: "BMR Calc" },
      { id: "Progress", label: "Progress" },
    ],
  },
  {
    label: "Gym",
    tabs: [
      { id: "Classes", label: "Classes" },
      { id: "Membership", label: "Membership" },
      { id: "Community", label: "Community" },
      { id: "Gallery", label: "Gallery" },
      { id: "News", label: "News" },
      { id: "PRLogbook", label: "PR Logbook" },
      { id: "About", label: "About Us" },
      { id: "Contact", label: "Contact" },
      { id: "Terms", label: "T&Cs" },
      { id: "Privacy", label: "Privacy Policy" },
      { id: "Advertise", label: "Advertise" },
    ],
  },
];

const BOTTOM_TABS = [
  { id: "Dashboard", icon: "home", label: "Home" },
  { id: "Classes", icon: "fitness_center", label: "Classes" },
  { id: "Checkin", icon: "where_to_vote", label: "Check-In" },
  { id: "Workout", icon: "bolt", label: "Tools" },
  { id: "Account", icon: "account_circle", label: "Me" },
];

const MORE_PAGES = [
  { id: "Nutrition", label: "Nutrition", group: "ai" },
  { id: "Progress", label: "Progress", group: "ai" },
  { id: "InBody", label: "InBody", group: "ai" },
  { id: "BMR", label: "BMR Calc", group: "ai" },
  { id: "Leaderboard", label: "Leaderboard", group: "gym" },
  { id: "Notifications", label: "Notifications", group: "gym" },
  { id: "Membership", label: "Membership", group: "gym" },
  { id: "Community", label: "Community", group: "gym" },
  { id: "Gallery", label: "Gallery", group: "gym" },
  { id: "News", label: "News & Events", group: "gym" },
  { id: "PRLogbook", label: "PR Logbook 🏆", group: "gym" },
  { id: "About", label: "About Us", group: "gym" },
  { id: "Contact", label: "Contact Us", group: "gym" },
  { id: "Terms", label: "T&Cs", group: "gym" },
  { id: "Privacy", label: "Privacy Policy", group: "gym" },
  { id: "Advertise", label: "Advertise 📣", group: "gym" },
];

interface LayoutProps {
  children: ReactNode;
  page: string;
  setPage: (page: string) => void;
}

export function Layout({ children, page, setPage }: LayoutProps) {
  const { user, toastData, clearToast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [showMore, setShowMore] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  if (!user) return null;
  const navigate = (id: string) => {
    setPage(id);
    setShowMore(false);
    setActiveGroup(null);
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground font-body"
      style={{ paddingBottom: isMobile ? 70 : 0 }}
    >
      {!isMobile && (
        <nav className="sticky top-0 z-[200] bg-background/95 backdrop-blur-xl border-b border-border px-5 h-[58px] flex items-center justify-between gap-4">
          <div
            onClick={() => navigate("Dashboard")}
            className="font-display text-[22px] tracking-[0.15em] text-primary cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
          >
            MK2 RIVERS
          </div>
          <div className="flex items-center gap-1 flex-1 justify-center">
            {NAV_GROUPS.map((group) => {
              const groupActive = group.tabs.some((t) => t.id === page);
              const isOpen = activeGroup === group.label;
              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setActiveGroup(isOpen ? null : group.label)}
                    onBlur={() => setTimeout(() => setActiveGroup(null), 150)}
                    className={`px-3 py-1.5 rounded-md border-none cursor-pointer font-body font-bold text-[11px] uppercase tracking-wide transition-all duration-150 flex items-center gap-1.5 ${
                      groupActive
                        ? "bg-primary/15 text-primary"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {group.label}
                    {group.label === "Tools" && (
                      <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full font-bold">
                        NEW
                      </span>
                    )}
                    <span className="text-[8px] opacity-60">▼</span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[160px] z-50 max-h-[400px] overflow-y-auto"
                      >
                        {group.tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => navigate(tab.id)}
                            className={`w-full px-4 py-2.5 text-left border-none cursor-pointer font-body font-medium text-xs transition-colors duration-100 ${
                              page === tab.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-transparent text-foreground hover:bg-secondary"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <div
              onClick={() => navigate("Account")}
              className="flex items-center gap-2 bg-secondary border border-border rounded-full py-1 pl-1.5 pr-3 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm"
                style={{ background: user.color, color: "#000" }}
              >
                {user.name[0]}
              </div>
              <span
                className={`text-xs font-bold ${page === "Account" ? "text-primary" : "text-foreground"}`}
              >
                {user.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </nav>
      )}

      {isMobile && (
        <div className="sticky top-0 z-[200] bg-background/97 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="font-display text-xl tracking-[0.15em] text-primary">
            MK2 RIVERS
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate("Notifications")}
              className="relative bg-transparent border-none cursor-pointer p-1 text-muted-foreground"
            >
              <MI icon="notifications" size={24} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div
              onClick={() => navigate("Account")}
              className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[15px] cursor-pointer"
              style={{ background: user.color, color: "#000" }}
            >
              {user.name[0]}
            </div>
          </div>
        </div>
      )}

      <motion.div
        key={page}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-background/98 border-t border-border flex h-16 backdrop-blur-xl">
          {BOTTOM_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setShowMore(false);
                navigate(t.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors duration-150 ${
                page === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MI icon={t.icon} size={22} />
              <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
                {t.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors ${showMore ? "text-primary" : "text-muted-foreground"}`}
          >
            <MI icon="grid_view" size={22} />
            <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
              More
            </span>
          </button>
        </nav>
      )}

      <AnimatePresence>
        {isMobile && showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199] bg-black/85 flex items-end"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full bg-card rounded-t-2xl p-5 pb-24 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MI icon="bolt" size={14} /> Tools
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MORE_PAGES.filter((p) => p.group === "ai").map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(p.id)}
                      className="bg-primary/10 border border-primary/30 rounded-xl p-3.5 font-body font-bold text-sm text-primary cursor-pointer text-left hover:bg-primary/20 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Gym & More
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MORE_PAGES.filter((p) => p.group === "gym").map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(p.id)}
                      className="bg-secondary border border-border rounded-xl p-3.5 font-body font-bold text-sm text-foreground cursor-pointer text-left hover:border-primary/30 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastData && (
        <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />
      )}
    </div>
  );
}

// import { type ReactNode, useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { useBreakpoint } from "@/hooks/useBreakpoint";
// import { Toast } from "@/components/shared/Toast";
// import { motion, AnimatePresence } from "framer-motion";

// const ALL_TABS = [
//   { id: "Dashboard", label: "Home" },
//   { id: "Workout", label: "Workout" },
//   { id: "Nutrition", label: "Nutrition" },
//   { id: "Progress", label: "Progress" },
//   { id: "Classes", label: "Classes" },
//   { id: "Checkin", label: "Check-In" },
//   { id: "Membership", label: "Membership" },
//   { id: "Community", label: "Community" },
//   { id: "Gallery", label: "Gallery" },
//   { id: "News", label: "News" },
// ];

// const BOTTOM_TABS = [
//   { id: "Dashboard", icon: "🏠", label: "Home" },
//   { id: "Classes", icon: "📅", label: "Classes" },
//   { id: "Checkin", icon: "✅", label: "Check-In" },
//   { id: "Workout", icon: "⚡", label: "Workout" },
//   { id: "Account", icon: "👤", label: "Me" },
// ];

// const MORE_PAGES = ["Nutrition", "Progress", "Membership", "Community", "Gallery", "News"];

// interface LayoutProps {
//   children: ReactNode;
//   page: string;
//   setPage: (page: string) => void;
// }

// export function Layout({ children, page, setPage }: LayoutProps) {
//   const { user, toastData, clearToast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [showMore, setShowMore] = useState(false);

//   if (!user) return null;

//   return (
//     <div className="min-h-screen bg-background text-foreground font-body" style={{ paddingBottom: isMobile ? 70 : 0 }}>
//       {/* Desktop top nav */}
//       {!isMobile && (
//         <nav className="sticky top-0 z-[200] bg-background/95 backdrop-blur-xl border-b border-border px-5 h-[58px] flex items-center justify-between">
//           <div
//             onClick={() => setPage("Dashboard")}
//             className="font-display text-[22px] tracking-[0.15em] text-primary cursor-pointer shrink-0"
//           >
//             MK2 RIVERS
//           </div>
//           <div className="flex gap-0.5 overflow-x-auto flex-1 justify-center px-3">
//             {ALL_TABS.map((t) => (
//               <button
//                 key={t.id}
//                 onClick={() => setPage(t.id)}
//                 className={`px-3 py-1.5 border-none rounded-md font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 ${
//                   page === t.id
//                     ? "bg-primary text-primary-foreground"
//                     : "bg-transparent text-muted-foreground hover:text-foreground"
//                 }`}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//           <div
//             onClick={() => setPage("Account")}
//             className="flex items-center gap-2 bg-secondary border border-border rounded-full py-1 pl-1.5 pr-3 cursor-pointer shrink-0 hover:border-primary/40 transition-colors"
//           >
//             <div
//               className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm text-primary-foreground"
//               style={{ background: user.color }}
//             >
//               {user.name[0]}
//             </div>
//             <span className={`text-xs font-bold ${page === "Account" ? "text-primary" : "text-foreground"}`}>
//               {user.name.split(" ")[0]}
//             </span>
//           </div>
//         </nav>
//       )}

//       {/* Mobile top bar */}
//       {isMobile && (
//         <div className="sticky top-0 z-[200] bg-background/97 border-b border-border px-4 py-3 flex items-center justify-between">
//           <div className="font-display text-xl tracking-[0.15em] text-primary">MK2 RIVERS</div>
//           <div
//             onClick={() => setPage("Account")}
//             className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[15px] text-primary-foreground cursor-pointer"
//             style={{ background: user.color }}
//           >
//             {user.name[0]}
//           </div>
//         </div>
//       )}

//       {/* Page content with animation */}
//       <motion.div
//         key={page}
//         initial={{ opacity: 0, y: 6 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.25, ease: "easeOut" }}
//       >
//         {children}
//       </motion.div>

//       {/* Mobile bottom nav */}
//       {isMobile && (
//         <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-background/98 border-t border-border flex h-16 backdrop-blur-xl">
//           {BOTTOM_TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => { setShowMore(false); setPage(t.id); }}
//               className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors duration-150 ${
//                 page === t.id ? "text-primary" : "text-muted-foreground"
//               }`}
//             >
//               <span className="text-lg">{t.icon}</span>
//               <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">{t.label}</span>
//             </button>
//           ))}
//           <button
//             onClick={() => setShowMore(!showMore)}
//             className="flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground"
//           >
//             <span className="text-lg">☰</span>
//             <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">More</span>
//           </button>
//         </nav>
//       )}

//       {/* Mobile more drawer */}
//       <AnimatePresence>
//         {isMobile && showMore && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 z-[199] bg-black/85 flex items-end"
//             onClick={() => setShowMore(false)}
//           >
//             <motion.div
//               initial={{ y: "100%" }}
//               animate={{ y: 0 }}
//               exit={{ y: "100%" }}
//               transition={{ type: "spring", damping: 25, stiffness: 300 }}
//               className="w-full bg-card rounded-t-2xl p-5 pb-20 border border-border"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="font-display text-lg text-muted-foreground mb-3.5 tracking-[0.1em]">
//                 MORE PAGES
//               </div>
//               <div className="grid grid-cols-2 gap-2.5">
//                 {MORE_PAGES.map((p) => (
//                   <button
//                     key={p}
//                     onClick={() => { setPage(p); setShowMore(false); }}
//                     className="bg-secondary border border-border rounded-xl p-3.5 font-body font-bold text-sm text-foreground cursor-pointer text-left hover:border-primary/40 transition-colors"
//                   >
//                     {p}
//                   </button>
//                 ))}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Toast */}
//       {toastData && <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />}
//     </div>
//   );
// }
