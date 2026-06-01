import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import type { MistakeCost } from "@/lib/behavioral-intel";
import { fmtMoney } from "@/lib/trade-utils";

export function MistakeCostTracker({ costs }: { costs: MistakeCost[] }) {
  const total = costs.reduce((a, b) => a + b.cost, 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface-card p-6 flex flex-col gap-4 h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="size-3.5 text-champagne" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
            Mistake Cost Tracker
          </div>
        </div>
        <div className={"font-mono text-xs tabular-nums " + (total < 0 ? "text-neg" : "text-faint")}>
          {total < 0 ? fmtMoney(total, { sign: true }) : "—"}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {costs.map((c, i) => {
          const isCost = c.cost < 0;
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              className={
                "rounded-lg border px-3.5 py-3 " +
                (isCost ? "border-neg/25 bg-neg/[0.06]" : "border-border bg-surface")
              }
              style={
                isCost
                  ? { boxShadow: "0 0 22px -10px color-mix(in oklab, var(--neg) 60%, transparent)" }
                  : undefined
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">
                  {c.label}{" "}
                  <span className="text-[10px] uppercase tracking-[0.16em] text-faint ml-1">
                    {c.periodLabel}
                  </span>
                </div>
                <div
                  className={
                    "font-mono text-sm tabular-nums shrink-0 " +
                    (isCost ? "text-neg" : "text-soft")
                  }
                >
                  {isCost ? fmtMoney(c.cost, { sign: true }) : "$0.00"}
                </div>
              </div>
              <div className="text-xs text-soft mt-1 leading-relaxed">{c.detail}</div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}