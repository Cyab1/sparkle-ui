import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  msg: string;
  type: string;
  onDone: () => void;
}

const typeColors: Record<string, string> = {
  success: "hsl(142 72% 37%)",
  error: "hsl(0 84% 51%)",
  info: "hsl(20 100% 50%)",
};

export function Toast({ msg, type, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = typeColors[type] || typeColors.info;
  const textColor = type === "error" ? "#fff" : "#000";

  return (
    <AnimatePresence>
      <div className="fixed bottom-5 right-5 left-5 z-[9999] flex justify-end">
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-xl px-5 py-3 font-bold text-sm font-body shadow-elevated max-w-[360px]"
          style={{ background: bg, color: textColor }}
        >
          {msg}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
