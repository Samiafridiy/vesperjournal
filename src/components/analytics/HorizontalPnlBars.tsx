import { motion } from "framer-motion";
import { fmtMoney } from "@/lib/trade-utils";

export type HBar = { name: string; pnl: number; n?: number };

export function HorizontalPnlBars({
  title,
  subtitle,
  data,
  emptyHint,
}: {
  title: string;
  subtitle?: string;
  data: HBar[];
  emptyHint?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  return (
    <div className="surface-card p-6 min-h-[320px] flex flex-col">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
          {title}
        </div>
        {subtitle && <div className="text-xs text-soft mt-0.5">{subtitle}</div>}
      </div>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-faint">
          {emptyHint ?? "Not enough data yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1">
          {data.map((d, i) => {
            const pct = (Math.abs(d.pnl) / max) * 100;
            const isPos = d.pnl >= 0;
            return (
              <div key={d.name} className="grid grid-cols-[80px_1fr_90px] items-center gap-3">
                <div className="text-xs text-soft truncate">{d.name}</div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                    className="h-full rounded-full"
                    style={{ background: isPos ? "var(--pos)" : "var(--neg)" }}
                  />
                </div>
                <div
                  className={
                    "font-mono text-xs tabular-nums text-right " +
                    (isPos ? "text-pos" : "text-neg")
                  }
                >
                  {fmtMoney(d.pnl, { sign: true })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}