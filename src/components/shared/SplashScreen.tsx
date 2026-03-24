import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "tagline" | "out">("logo");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("tagline"), 900);
    const t2 = setTimeout(() => setPhase("out"), 2200);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== "out" && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#070707",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
              radial-gradient(ellipse 60% 50% at 50% 50%, hsl(20 100% 50% / 0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40% 40% at 30% 70%, hsl(187 100% 40% / 0.08) 0%, transparent 60%)`,
            }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 1, textAlign: "center" }}
          >
            {!imgError ? (
              <img
                src="/mk2r-logo.jpg"
                alt="MK2 Rivers Fitness"
                onError={() => setImgError(true)}
                style={{
                  height: 90,
                  width: "auto",
                  objectFit: "contain",
                  marginBottom: 16,
                }}
              />
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 42,
                    letterSpacing: "0.2em",
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  MK2 RIVERS
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "hsl(187 100% 40%)",
                    marginTop: 6,
                  }}
                >
                  FITNESS HUB
                </div>
              </div>
            )}

            {/* Tagline */}
            <AnimatePresence>
              {phase === "tagline" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Train Harder. Live Stronger.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              position: "absolute",
              bottom: 48,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
            }}
          >
            <div
              style={{
                height: 2,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                style={{
                  height: "100%",
                  background: "hsl(20 100% 50%)",
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 9,
                textAlign: "center",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.2)",
                fontFamily: "var(--font-body)",
              }}
            >
              Ruimsig, Johannesburg
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
