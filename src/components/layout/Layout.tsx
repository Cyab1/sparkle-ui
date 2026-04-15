import { type ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Toast } from "@/components/shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

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
      // Notifications removed — bell icon handles this in top bar
    ],
  },
  {
    label: "Tools",
    tabs: [
      { id: "BMR", label: "BMR Calculator" },
      { id: "Nutrition", label: "AI Nutrition Coach" },
      { id: "InBody", label: "InBody Assessments" },
      { id: "Progress", label: "Progress Report" },
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

// ── Bottom nav: Home | Gallery | Tools | Me
// Classes & Check-In removed — they're accessible from the Dashboard
const BOTTOM_TABS = [
  { id: "Dashboard", icon: "home", label: "Home" },
  { id: "Gallery", icon: "photo_library", label: "Gallery" },
  { id: "Workout", icon: "bolt", label: "Tools" },
  { id: "Account", icon: "account_circle", label: "Me" },
];

// More drawer pages
const MORE_PAGES = [
  // Tools
  { id: "BMR", label: "BMR Calculator", group: "tools" },
  { id: "Nutrition", label: "AI Nutrition Coach", group: "tools" },
  { id: "InBody", label: "InBody Assessments", group: "tools" },
  { id: "Progress", label: "Progress Report", group: "tools" },
  // Gym
  { id: "Classes", label: "Book a Class", group: "gym" },
  { id: "Checkin", label: "Check-In", group: "gym" },
  { id: "Leaderboard", label: "Leaderboard", group: "gym" },
  { id: "PRLogbook", label: "PR Logbook 🏆", group: "gym" },
  { id: "Community", label: "Community", group: "gym" },
  { id: "News", label: "News & Events", group: "gym" },
  { id: "Membership", label: "Membership", group: "gym" },
  // Settings & Info — Notification Settings lives here now
  { id: "Notifications", label: "Notification Settings", group: "settings" },
  { id: "About", label: "About Us", group: "settings" },
  { id: "Contact", label: "Contact Us", group: "settings" },
  { id: "Advertise", label: "Advertise 📣", group: "settings" },
  { id: "Terms", label: "T&Cs", group: "settings" },
  { id: "Privacy", label: "Privacy Policy", group: "settings" },
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Track unread notification count for the bell
  useEffect(() => {
    if (!user) return;
    return onValue(ref(db, "admin_news"), (snap) => {
      if (!snap.exists()) return;
      const lastSeen = (user as any).lastSeenNewsAt ?? 0;
      const items = Object.values(snap.val()) as any[];
      const unread = items.filter((n) => (n.createdAt ?? 0) > lastSeen).length;
      setUnreadCount(unread);
    });
  }, [user]);

  if (!user) return null;

  const navigate = (id: string) => {
    setPage(id);
    setShowMore(false);
    setActiveGroup(null);
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground font-body"
      style={{
        paddingBottom: isMobile
          ? "calc(72px + env(safe-area-inset-bottom, 0px))"
          : 0,
        overflowX: "hidden",
        maxWidth: "100vw",
      }}
    >
      {/* ── Desktop nav */}
      {!isMobile && (
        <nav className="sticky top-0 z-[200] bg-background/95 backdrop-blur-xl border-b border-border px-5 h-[58px] flex items-center justify-between gap-4">
          {/* Logo + wordmark */}
          <div
            onClick={() => navigate("Dashboard")}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
          >
            <img
              src="/mk2r-logo.jpg"
              alt="MK2R Fitness"
              style={{
                width: 40,
                height: 40,
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
            <div>
              <div className="font-display text-[22px] tracking-[0.15em] text-primary leading-none">
                MK2 RIVERS
              </div>
              <div className="font-display text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
                Gym Pro
              </div>
            </div>
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

            {/* 🔔 Bell — actual notification messages */}
            <button
              onClick={() => navigate("Notifications")}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-secondary border border-border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <MI icon="notifications" size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "hsl(20 100% 50%)", color: "#000" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

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

      {/* ── Mobile top bar */}
      {isMobile && (
        <div
          className="sticky top-0 z-[200] bg-background/97 border-b border-border px-4 flex items-center justify-between"
          style={{
            paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
            paddingBottom: "12px",
          }}
        >
          {/* Logo + wordmark */}
          <div className="flex items-center gap-2">
            <img
              src="/mk2r-logo.jpg"
              alt="MK2R Fitness"
              style={{
                width: 38,
                height: 38,
                objectFit: "contain",
                borderRadius: 7,
              }}
            />
            <div>
              <div className="font-display text-xl tracking-[0.15em] text-primary leading-tight">
                MK2 RIVERS
              </div>
              <div className="font-display text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
                Gym Pro
              </div>
            </div>
          </div>

          {/* Right side — theme toggle + bell + avatar */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* 🔔 Bell — actual notification messages */}
            <button
              onClick={() => navigate("Notifications")}
              className="relative w-8 h-8 flex items-center justify-center rounded-full bg-secondary border border-border cursor-pointer"
            >
              <MI icon="notifications" size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "hsl(20 100% 50%)", color: "#000" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
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

      {/* ── Page content */}
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {/* ── Mobile bottom nav: Home | Gallery | Tools | Me */}
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-[200] bg-background/98 border-t border-border flex backdrop-blur-xl"
          style={{
            height: "calc(64px + env(safe-area-inset-bottom, 0px))",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
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
              style={{ paddingBottom: 0 }}
            >
              <MI icon={t.icon} size={22} />
              <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
                {t.label}
              </span>
            </button>
          ))}
          {/* More / Grid button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors ${
              showMore ? "text-primary" : "text-muted-foreground"
            }`}
            style={{ paddingBottom: 0 }}
          >
            <MI icon="grid_view" size={22} />
            <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
              More
            </span>
          </button>
        </nav>
      )}

      {/* ── More drawer */}
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
              className="w-full bg-card rounded-t-2xl p-5 border border-border"
              style={{
                paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tools */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MI icon="bolt" size={14} /> Tools
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MORE_PAGES.filter((p) => p.group === "tools").map((p) => (
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

              {/* Gym */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Gym
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

              {/* Settings & Info — Notification Settings is here */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Settings & Info
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MORE_PAGES.filter((p) => p.group === "settings").map((p) => (
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
// import { ThemeToggle } from "@/components/shared/ThemeToggle";

// function ensureMaterialIcons() {
//   if (typeof document === "undefined") return;
//   if (document.getElementById("material-symbols")) return;
//   const link = document.createElement("link");
//   link.id = "material-symbols";
//   link.rel = "stylesheet";
//   link.href =
//     "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0";
//   document.head.appendChild(link);
// }
// ensureMaterialIcons();

// function MI({ icon, size = 22 }: { icon: string; size?: number }) {
//   return (
//     <span
//       className="material-symbols-rounded"
//       style={{ fontSize: size, lineHeight: 1, userSelect: "none" }}
//     >
//       {icon}
//     </span>
//   );
// }

// const NAV_GROUPS = [
//   {
//     label: "Main",
//     tabs: [
//       { id: "Dashboard", label: "Home" },
//       { id: "Checkin", label: "Check-In" },
//       { id: "Leaderboard", label: "Leaderboard" },
//       { id: "Notifications", label: "Notifications" },
//     ],
//   },
//   {
//     label: "Tools",
//     tabs: [
//       { id: "Workout", label: "Workout" },
//       { id: "Nutrition", label: "Nutrition" },
//       { id: "InBody", label: "InBody" },
//       { id: "BMR", label: "BMR Calc" },
//       { id: "Progress", label: "Progress" },
//     ],
//   },
//   {
//     label: "Gym",
//     tabs: [
//       { id: "Classes", label: "Classes" },
//       { id: "Membership", label: "Membership" },
//       { id: "Community", label: "Community" },
//       { id: "Gallery", label: "Gallery" },
//       { id: "News", label: "News" },
//       { id: "PRLogbook", label: "PR Logbook" },
//       { id: "About", label: "About Us" },
//       { id: "Contact", label: "Contact" },
//       { id: "Terms", label: "T&Cs" },
//       { id: "Privacy", label: "Privacy Policy" },
//       { id: "Advertise", label: "Advertise" },
//     ],
//   },
// ];

// const BOTTOM_TABS = [
//   { id: "Dashboard", icon: "home", label: "Home" },
//   { id: "Classes", icon: "fitness_center", label: "Classes" },
//   { id: "Checkin", icon: "where_to_vote", label: "Check-In" },
//   { id: "Workout", icon: "bolt", label: "Tools" },
//   { id: "Account", icon: "account_circle", label: "Me" },
// ];

// const MORE_PAGES = [
//   { id: "Nutrition", label: "Nutrition", group: "ai" },
//   { id: "Progress", label: "Progress", group: "ai" },
//   { id: "InBody", label: "InBody", group: "ai" },
//   { id: "BMR", label: "BMR Calc", group: "ai" },
//   { id: "Leaderboard", label: "Leaderboard", group: "gym" },
//   { id: "Notifications", label: "Notifications", group: "gym" },
//   { id: "Membership", label: "Membership", group: "gym" },
//   { id: "Community", label: "Community", group: "gym" },
//   { id: "Gallery", label: "Gallery", group: "gym" },
//   { id: "News", label: "News & Events", group: "gym" },
//   { id: "PRLogbook", label: "PR Logbook 🏆", group: "gym" },
//   { id: "About", label: "About Us", group: "gym" },
//   { id: "Contact", label: "Contact Us", group: "gym" },
//   { id: "Terms", label: "T&Cs", group: "gym" },
//   { id: "Privacy", label: "Privacy Policy", group: "gym" },
//   { id: "Advertise", label: "Advertise 📣", group: "gym" },
// ];

// interface LayoutProps {
//   children: ReactNode;
//   page: string;
//   setPage: (page: string) => void;
// }

// export function Layout({ children, page, setPage }: LayoutProps) {
//   const { user, toastData, clearToast } = useAuth();
//   const { isMobile } = useBreakpoint();
//   const [showMore, setShowMore] = useState(false);
//   const [activeGroup, setActiveGroup] = useState<string | null>(null);
//   if (!user) return null;
//   const navigate = (id: string) => {
//     setPage(id);
//     setShowMore(false);
//     setActiveGroup(null);
//   };

//   return (
//     <div
//       className="min-h-screen bg-background text-foreground font-body"
//       style={{ paddingBottom: isMobile ? 70 : 0 }}
//     >
//       {!isMobile && (
//         <nav className="sticky top-0 z-[200] bg-background/95 backdrop-blur-xl border-b border-border px-5 h-[58px] flex items-center justify-between gap-4">
//           <div
//             onClick={() => navigate("Dashboard")}
//             className="font-display text-[22px] tracking-[0.15em] text-primary cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
//           >
//             MK2 RIVERS
//           </div>
//           <div className="flex items-center gap-1 flex-1 justify-center">
//             {NAV_GROUPS.map((group) => {
//               const groupActive = group.tabs.some((t) => t.id === page);
//               const isOpen = activeGroup === group.label;
//               return (
//                 <div key={group.label} className="relative">
//                   <button
//                     onClick={() => setActiveGroup(isOpen ? null : group.label)}
//                     onBlur={() => setTimeout(() => setActiveGroup(null), 150)}
//                     className={`px-3 py-1.5 rounded-md border-none cursor-pointer font-body font-bold text-[11px] uppercase tracking-wide transition-all duration-150 flex items-center gap-1.5 ${
//                       groupActive
//                         ? "bg-primary/15 text-primary"
//                         : "bg-transparent text-muted-foreground hover:text-foreground"
//                     }`}
//                   >
//                     {group.label}
//                     {group.label === "Tools" && (
//                       <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full font-bold">
//                         NEW
//                       </span>
//                     )}
//                     <span className="text-[8px] opacity-60">▼</span>
//                   </button>
//                   <AnimatePresence>
//                     {isOpen && (
//                       <motion.div
//                         initial={{ opacity: 0, y: -4, scale: 0.97 }}
//                         animate={{ opacity: 1, y: 0, scale: 1 }}
//                         exit={{ opacity: 0, y: -4, scale: 0.97 }}
//                         transition={{ duration: 0.12 }}
//                         className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[160px] z-50 max-h-[400px] overflow-y-auto"
//                       >
//                         {group.tabs.map((tab) => (
//                           <button
//                             key={tab.id}
//                             onClick={() => navigate(tab.id)}
//                             className={`w-full px-4 py-2.5 text-left border-none cursor-pointer font-body font-medium text-xs transition-colors duration-100 ${
//                               page === tab.id
//                                 ? "bg-primary text-primary-foreground"
//                                 : "bg-transparent text-foreground hover:bg-secondary"
//                             }`}
//                           >
//                             {tab.label}
//                           </button>
//                         ))}
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                 </div>
//               );
//             })}
//           </div>
//           <div className="flex items-center gap-2 shrink-0">
//             <ThemeToggle />
//             <div
//               onClick={() => navigate("Account")}
//               className="flex items-center gap-2 bg-secondary border border-border rounded-full py-1 pl-1.5 pr-3 cursor-pointer hover:border-primary/40 transition-colors"
//             >
//               <div
//                 className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm"
//                 style={{ background: user.color, color: "#000" }}
//               >
//                 {user.name[0]}
//               </div>
//               <span
//                 className={`text-xs font-bold ${page === "Account" ? "text-primary" : "text-foreground"}`}
//               >
//                 {user.name.split(" ")[0]}
//               </span>
//             </div>
//           </div>
//         </nav>
//       )}

//       {isMobile && (
//         <div className="sticky top-0 z-[200] bg-background/97 border-b border-border px-4 py-3 flex items-center justify-between">
//           <div className="font-display text-xl tracking-[0.15em] text-primary">
//             MK2 RIVERS
//           </div>
//           <div className="flex items-center gap-2">
//             <ThemeToggle />
//             <button
//               onClick={() => navigate("Notifications")}
//               className="relative bg-transparent border-none cursor-pointer p-1 text-muted-foreground"
//             >
//               <MI icon="notifications" size={24} />
//               <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
//             </button>
//             <div
//               onClick={() => navigate("Account")}
//               className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[15px] cursor-pointer"
//               style={{ background: user.color, color: "#000" }}
//             >
//               {user.name[0]}
//             </div>
//           </div>
//         </div>
//       )}

//       <motion.div
//         key={page}
//         initial={{ opacity: 0, y: 6 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.22, ease: "easeOut" }}
//       >
//         {children}
//       </motion.div>

//       {isMobile && (
//         <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-background/98 border-t border-border flex h-16 backdrop-blur-xl">
//           {BOTTOM_TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => {
//                 setShowMore(false);
//                 navigate(t.id);
//               }}
//               className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors duration-150 ${
//                 page === t.id ? "text-primary" : "text-muted-foreground"
//               }`}
//             >
//               <MI icon={t.icon} size={22} />
//               <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
//                 {t.label}
//               </span>
//             </button>
//           ))}
//           <button
//             onClick={() => setShowMore(!showMore)}
//             className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors ${showMore ? "text-primary" : "text-muted-foreground"}`}
//           >
//             <MI icon="grid_view" size={22} />
//             <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">
//               More
//             </span>
//           </button>
//         </nav>
//       )}

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
//               transition={{ type: "spring", damping: 26, stiffness: 300 }}
//               className="w-full bg-card rounded-t-2xl p-5 pb-24 border border-border"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="mb-4">
//                 <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
//                   <MI icon="bolt" size={14} /> Tools
//                 </div>
//                 <div className="grid grid-cols-2 gap-2">
//                   {MORE_PAGES.filter((p) => p.group === "ai").map((p) => (
//                     <button
//                       key={p.id}
//                       onClick={() => navigate(p.id)}
//                       className="bg-primary/10 border border-primary/30 rounded-xl p-3.5 font-body font-bold text-sm text-primary cursor-pointer text-left hover:bg-primary/20 transition-colors"
//                     >
//                       {p.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
//                   Gym & More
//                 </div>
//                 <div className="grid grid-cols-2 gap-2">
//                   {MORE_PAGES.filter((p) => p.group === "gym").map((p) => (
//                     <button
//                       key={p.id}
//                       onClick={() => navigate(p.id)}
//                       className="bg-secondary border border-border rounded-xl p-3.5 font-body font-bold text-sm text-foreground cursor-pointer text-left hover:border-primary/30 transition-colors"
//                     >
//                       {p.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {toastData && (
//         <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />
//       )}
//     </div>
//   );
// }
