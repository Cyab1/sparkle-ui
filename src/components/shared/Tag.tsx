import { cn } from "@/lib/utils";

interface TagProps {
  color: string;
  children: React.ReactNode;
  className?: string;
}

export function Tag({ color, children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase border",
        className
      )}
      style={{
        background: `${color}18`,
        color: color,
        borderColor: `${color}33`,
      }}
    >
      {children}
    </span>
  );
}
