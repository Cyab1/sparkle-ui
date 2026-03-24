import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface NotFoundProps {
  setPage: (page: string) => void;
}

export function NotFound({ setPage }: NotFoundProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div
      className={`min-h-[80vh] flex flex-col items-center justify-center text-center ${isMobile ? "px-6 py-12" : "px-8 py-20"}`}
    >
      {/* Animated 404 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6"
      >
        <div
          className="font-display leading-none mb-2"
          style={{
            fontSize: isMobile ? "96px" : "140px",
            color: "hsl(20 100% 50%)",
            textShadow: "0 0 60px hsl(20 100% 50% / 0.3)",
          }}
        >
          404
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl mb-2"
        >
          🏋️
        </motion.div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 max-w-[380px]"
      >
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-3 text-foreground">
          PAGE NOT FOUND
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Looks like this page skipped leg day and went missing. Don't worry —
          your progress is still here, just head back home.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <button
          onClick={() => setPage("Dashboard")}
          className="px-8 py-3 rounded-xl font-body font-bold text-sm uppercase tracking-wider border-none cursor-pointer transition-all active:scale-95"
          style={{
            background: "hsl(20 100% 50%)",
            color: "#000",
            boxShadow: "0 4px 24px hsl(20 100% 50% / 0.35)",
          }}
        >
          🏠 Go to Dashboard
        </button>
        <button
          onClick={() => setPage("Classes")}
          className="px-8 py-3 rounded-xl font-body font-bold text-sm uppercase tracking-wider cursor-pointer transition-all active:scale-95"
          style={{
            background: "hsl(var(--secondary))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          📅 Browse Classes
        </button>
      </motion.div>

      {/* Bottom tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-[11px] tracking-[0.2em] uppercase text-muted-foreground"
      >
        MK Two Rivers Fitness · Ruimsig, Johannesburg
      </motion.div>
    </div>
  );
}

// import { useLocation } from "react-router-dom";
// import { useEffect } from "react";

// const NotFound = () => {
//   const location = useLocation();

//   useEffect(() => {
//     console.error("404 Error: User attempted to access non-existent route:", location.pathname);
//   }, [location.pathname]);

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-muted">
//       <div className="text-center">
//         <h1 className="mb-4 text-4xl font-bold">404</h1>
//         <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
//         <a href="/" className="text-primary underline hover:text-primary/90">
//           Return to Home
//         </a>
//       </div>
//     </div>
//   );
// };

// export default NotFound;
