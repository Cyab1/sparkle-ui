import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [firebaseOk, setFirebaseOk] = useState(true);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Firebase .info/connected — built-in Firebase connection state
    const connRef = ref(db, ".info/connected");
    const unsub = onValue(connRef, (snap) => {
      setFirebaseOk(snap.val() === true);
    });

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsub();
    };
  }, []);

  const show = !online || !firebaseOk;
  const msg = !online
    ? "📵 No internet connection — some features may not work"
    : "⏳ Connecting to server — please wait…";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center py-2.5 px-4 text-xs font-bold font-body"
          style={{
            background: !online ? "hsl(0 84% 45%)" : "hsl(38 92% 44%)",
            color: "#fff",
          }}
        >
          {msg}
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
