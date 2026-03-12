import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BtnProps {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "subtle" | "success";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  className?: string;
  accentColor?: string;
}

const variantStyles: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-110",
  ghost: "bg-transparent text-primary border border-primary hover:bg-primary/10",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
  subtle: "bg-secondary text-secondary-foreground border border-border hover:bg-surface-high",
  success: "bg-mk2-green text-primary-foreground hover:brightness-110",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3.5 py-1.5 text-[11px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-7 py-3 text-[15px]",
};

export function Btn({ children, variant = "primary", size = "md", onClick, disabled, full, className, accentColor }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold font-body tracking-wide uppercase transition-all duration-150 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        full && "w-full",
        className
      )}
      style={accentColor ? { background: accentColor } : undefined}
    >
      {children}
    </button>
  );
}
