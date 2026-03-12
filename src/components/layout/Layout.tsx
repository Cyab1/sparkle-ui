import { type ReactNode, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Toast } from "@/components/shared/Toast";
import { motion, AnimatePresence } from "framer-motion";

const ALL_TABS = [
  { id: "Dashboard", label: "Home" },
  { id: "Workout", label: "Workout" },
  { id: "Nutrition", label: "Nutrition" },
  { id: "Progress", label: "Progress" },
  { id: "Classes", label: "Classes" },
  { id: "Checkin", label: "Check-In" },
  { id: "Membership", label: "Membership" },
  { id: "Community", label: "Community" },
  { id: "Gallery", label: "Gallery" },
  { id: "News", label: "News" },
];

const BOTTOM_TABS = [
  { id: "Dashboard", icon: "🏠", label: "Home" },
  { id: "Classes", icon: "📅", label: "Classes" },
  { id: "Checkin", icon: "✅", label: "Check-In" },
  { id: "Workout", icon: "⚡", label: "Workout" },
  { id: "Account", icon: "👤", label: "Me" },
];

const MORE_PAGES = ["Nutrition", "Progress", "Membership", "Community", "Gallery", "News"];

interface LayoutProps {
  children: ReactNode;
  page: string;
  setPage: (page: string) => void;
}

export function Layout({ children, page, setPage }: LayoutProps) {
  const { user, toastData, clearToast } = useAuth();
  const { isMobile } = useBreakpoint();
  const [showMore, setShowMore] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-body" style={{ paddingBottom: isMobile ? 70 : 0 }}>
      {/* Desktop top nav */}
      {!isMobile && (
        <nav className="sticky top-0 z-[200] bg-background/95 backdrop-blur-xl border-b border-border px-5 h-[58px] flex items-center justify-between">
          <div
            onClick={() => setPage("Dashboard")}
            className="font-display text-[22px] tracking-[0.15em] text-primary cursor-pointer shrink-0"
          >
            MK2 RIVERS
          </div>
          <div className="flex gap-0.5 overflow-x-auto flex-1 justify-center px-3">
            {ALL_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPage(t.id)}
                className={`px-3 py-1.5 border-none rounded-md font-body font-bold text-[11px] uppercase tracking-wide cursor-pointer whitespace-nowrap transition-all duration-150 ${
                  page === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            onClick={() => setPage("Account")}
            className="flex items-center gap-2 bg-secondary border border-border rounded-full py-1 pl-1.5 pr-3 cursor-pointer shrink-0 hover:border-primary/40 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm text-primary-foreground"
              style={{ background: user.color }}
            >
              {user.name[0]}
            </div>
            <span className={`text-xs font-bold ${page === "Account" ? "text-primary" : "text-foreground"}`}>
              {user.name.split(" ")[0]}
            </span>
          </div>
        </nav>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div className="sticky top-0 z-[200] bg-background/97 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="font-display text-xl tracking-[0.15em] text-primary">MK2 RIVERS</div>
          <div
            onClick={() => setPage("Account")}
            className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[15px] text-primary-foreground cursor-pointer"
            style={{ background: user.color }}
          >
            {user.name[0]}
          </div>
        </div>
      )}

      {/* Page content with animation */}
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-background/98 border-t border-border flex h-16 backdrop-blur-xl">
          {BOTTOM_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setShowMore(false); setPage(t.id); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer transition-colors duration-150 ${
                page === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">{t.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground"
          >
            <span className="text-lg">☰</span>
            <span className="text-[9px] font-body font-bold tracking-[0.06em] uppercase">More</span>
          </button>
        </nav>
      )}

      {/* Mobile more drawer */}
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
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full bg-card rounded-t-2xl p-5 pb-20 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-display text-lg text-muted-foreground mb-3.5 tracking-[0.1em]">
                MORE PAGES
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {MORE_PAGES.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setShowMore(false); }}
                    className="bg-secondary border border-border rounded-xl p-3.5 font-body font-bold text-sm text-foreground cursor-pointer text-left hover:border-primary/40 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onDone={clearToast} />}
    </div>
  );
}
