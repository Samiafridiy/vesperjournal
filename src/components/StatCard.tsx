import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "pos" | "neg";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("surface-card p-6 flex flex-col gap-5 transition-colors hover:bg-surface-2", className)}>
      <div className="text-faint text-[11px] uppercase tracking-[0.18em] font-medium">{label}</div>
      <div
        className={cn(
          "font-mono text-3xl md:text-[34px] font-medium tracking-tight tabular-nums leading-none",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-soft">{sub}</div>}
      {children}
    </div>
  );
}