import { useEffect } from "react";
import { motion } from "framer-motion";

export function BookingCancel({ onContinue }: { onContinue: () => void }) {
  // Clean up URL without reloading
  useEffect(() => {
    window.history.replaceState({}, document.title, "/");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        {/* Cancel icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.15,
            type: "spring",
            stiffness: 200,
            damping: 14,
          }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: "hsl(38 92% 44% / 0.12)",
            border: "2px solid hsl(38 92% 44% / 0.35)",
          }}
        >
          <span className="text-4xl">✕</span>
        </motion.div>

        {/* Heading */}
        <div
          className="font-display text-3xl tracking-wide mb-2"
          style={{ color: "hsl(38 92% 44%)" }}
        >
          PAYMENT CANCELLED
        </div>
        <div className="text-muted-foreground text-sm mb-8">
          No payment was taken. Your spot has not been reserved.
        </div>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 mb-8 text-left"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div className="font-bold text-sm mb-3 text-foreground">
            What happened?
          </div>
          <div className="flex flex-col gap-2.5 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2.5">
              <span
                className="shrink-0 mt-0.5"
                style={{ color: "hsl(38 92% 44%)" }}
              >
                →
              </span>
              <span>
                You cancelled the payment on the PayFast page — no money was
                charged.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span
                className="shrink-0 mt-0.5"
                style={{ color: "hsl(38 92% 44%)" }}
              >
                →
              </span>
              <span>
                The class spot is still available. Go back and try again if
                you'd like to book.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span
                className="shrink-0 mt-0.5"
                style={{ color: "hsl(38 92% 44%)" }}
              >
                →
              </span>
              <span>
                If you were charged but ended up here, please contact the gym
                immediately.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Contact note */}
        <div
          className="rounded-xl px-4 py-3 mb-8 text-xs"
          style={{
            background: "hsl(217 91% 53% / 0.06)",
            border: "1px solid hsl(217 91% 53% / 0.2)",
            color: "hsl(217 91% 53%)",
          }}
        >
          Questions? Contact us via WhatsApp at{" "}
          <a
            href="https://wa.me/27645386375"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            064 538 6375
          </a>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl font-body font-bold text-sm border-none cursor-pointer transition-all active:scale-95"
            style={{ background: "hsl(20 100% 50%)", color: "#000" }}
          >
            Back to Classes →
          </button>
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-2xl font-body font-bold text-sm cursor-pointer transition-all active:scale-95"
            style={{
              background: "transparent",
              color: "hsl(var(--muted-foreground))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
