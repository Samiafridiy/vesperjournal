import type { ReactNode } from "react";
import { motion } from "framer-motion";
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
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "surface-card p-6 flex flex-col gap-5 transition-colors hover:bg-surface-2 relative overflow-hidden group",
        tone === "pos" && "hover:shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--pos)_35%,transparent)]",
        tone === "neg" && "hover:shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neg)_35%,transparent)]",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity",
          tone === "pos"
            ? "bg-gradient-to-r from-transparent via-pos to-transparent"
            : tone === "neg"
            ? "bg-gradient-to-r from-transparent via-neg to-transparent"
            : "bg-gradient-to-r from-transparent via-champagne to-transparent",
        )}
      />
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
    </motion.div>
  );
}