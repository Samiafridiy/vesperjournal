import { useMemo } from "react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DayOfWeekHeatmap({ trades }: { trades: Trade[] }) {
  const days = useMemo(() => {
    const totals = new Array(7).fill(0) as number[];
    const counts = new Array(7).fill(0) as number[];
    for (const t of trades) {
      if (t.pnl == null) continue;
      const d = new Date(t.trade_date);
      // Mon=0..Sun=6
      const idx = (d.getDay() + 6) % 7;
      totals[idx] += t.pnl;
      counts[idx] += 1;
    }
    return DAYS.map((name, i) => ({ name, pnl: totals[i], n: counts[i] }));
  }, [trades]);

  const max = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));

  return (
    <div className="surface-card p-6">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
          P&L by Day of Week
        </div>
        <div className="text-xs text-soft mt-0.5">Deep red = worst, deep green = best</div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const intensity = Math.min(1, Math.abs(d.pnl) / max);
          const isPos = d.pnl > 0;
          const isNeg = d.pnl < 0;
          const bg = d.n === 0
            ? "var(--surface-2)"
            : isPos
            ? `color-mix(in oklab, var(--pos) ${20 + intensity * 70}%, transparent)`
            : isNeg
            ? `color-mix(in oklab, var(--neg) ${20 + intensity * 70}%, transparent)`
            : "var(--surface-2)";
          return (
          <div
            key={d.name}
            className="rounded-lg border border-border/50 p-3 flex flex-col items-center gap-1 min-h-[78px] justify-center"
            style={{ background: bg }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/90">{d.name}</div>
            <div
              className={
                "font-mono text-xs tabular-nums font-medium " +
                (d.n === 0 ? "text-muted-foreground" : "text-foreground")
              }
            >
              {d.n === 0 ? "—" : fmtMoney(d.pnl, { sign: true })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}