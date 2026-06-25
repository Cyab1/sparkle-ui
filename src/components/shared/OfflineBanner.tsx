import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOnline(false);
      setShowBack(false);
    };
    const goOnline = () => {
      setIsOnline(true);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(!isOnline || showBack) && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: "10px 16px",
            background: isOnline ? "hsl(142 72% 37%)" : "hsl(0 84% 51%)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isOnline
            ? "✅ You're back online!"
            : "⚠ No internet connection — some features may not work"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// HOW TO ADD:
// In App.tsx, import and add <OfflineBanner /> before <Layout>:
//
// import { OfflineBanner } from "@/components/shared/OfflineBanner";
//
// return (
//   <>
//     <OfflineBanner />
//     <Layout page={page} setPage={setPage}>
//       ...
//     </Layout>
//   </>
// );
