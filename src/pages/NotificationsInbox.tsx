import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Btn } from "@/components/shared/Btn";
import { PageTitle } from "@/components/shared/PageTitle";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const getIcon = (title: string, message: string) => {
  const lower = (title + " " + message).toLowerCase();
  if (lower.includes("class") || lower.includes("booking")) return "🏋️";
  if (lower.includes("reward") || lower.includes("points")) return "🏆";
  if (lower.includes("challenge")) return "🏁";
  if (lower.includes("workout")) return "⚡";
  if (lower.includes("check")) return "✅";
  if (lower.includes("news")) return "📢";
  if (lower.includes("poll") || lower.includes("community")) return "💬";
  return "🔔";
};

const getTypeColor = (title: string, message: string) => {
  const lower = (title + " " + message).toLowerCase();
  if (lower.includes("class") || lower.includes("booking"))
    return "hsl(20 100% 50%)";
  if (lower.includes("reward") || lower.includes("points"))
    return "hsl(38 92% 44%)";
  if (lower.includes("challenge")) return "hsl(263 85% 58%)";
  if (lower.includes("workout")) return "hsl(217 91% 53%)";
  if (lower.includes("check")) return "hsl(142 72% 37%)";
  if (lower.includes("news")) return "hsl(20 100% 50%)";
  return "hsl(var(--muted-foreground))";
};

export function NotificationsInbox({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(user?.uid || null);

  // Mark all news as seen when inbox opens — clears the bell badge
  useState(() => {
    if (!user?.uid) return;
    set(ref(db, `mk2_users/${user.uid}/lastSeenNewsAt`), Date.now()).catch(
      () => {},
    );
  });

  if (!user) return null;

  return (
    <div
      className={`max-w-[760px] mx-auto ${isMobile ? "px-3.5 py-5" : "px-6 py-10"}`}
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <PageTitle sub="Your latest updates and alerts">
          Notifications{" "}
          {unreadCount > 0 && (
            <span className="text-primary text-[32px]">({unreadCount})</span>
          )}
        </PageTitle>
        <button
          onClick={() => setPage("NotificationSettings")}
          className="text-xs font-bold bg-transparent border border-border rounded-lg px-3 py-1.5 cursor-pointer text-muted-foreground hover:border-primary/40 transition-colors"
        >
          ⚙ Settings
        </button>
      </div>

      {/* Mark all read */}
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary bg-transparent border-none cursor-pointer font-bold"
          >
            Mark all read
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="mk2-card text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">🔔</div>
          <div className="font-bold text-sm mb-1">All caught up!</div>
          <div className="text-xs">No notifications yet.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n, i) => {
            const icon = getIcon(n.title, n.message);
            const color = getTypeColor(n.title, n.message);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markAsRead(n.id)}
                className="mk2-card cursor-pointer transition-opacity"
                style={{
                  borderLeft: `3px solid ${color}`,
                  opacity: n.read ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div className="font-bold text-sm">{n.title}</div>
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          {formatTime(n.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {n.message}
                    </div>
                    {n.link && (
                      <div className="mt-2 text-[10px] font-semibold text-primary">
                        Tap to view →
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Btn variant="ghost" onClick={() => setPage("Dashboard")}>
          ← Back to Dashboard
        </Btn>
      </div>
    </div>
  );
}
