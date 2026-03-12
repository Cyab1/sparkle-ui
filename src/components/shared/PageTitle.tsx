import { type ReactNode } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { motion } from "framer-motion";

interface PageTitleProps {
  children: ReactNode;
  sub?: string;
}

export function PageTitle({ children, sub }: PageTitleProps) {
  const { isMobile } = useBreakpoint();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-7"
    >
      <div
        className={cn("font-display tracking-[0.06em] leading-none mb-1", isMobile ? "text-4xl" : "text-5xl")}
      >
        {children}
      </div>
      {sub && <div className="text-muted-foreground text-sm font-body">{sub}</div>}
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
