import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";

export function RecentTrades({ trades }: { trades: Trade[] }) {
  const recent = [...trades]
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
    .slice(0, 6);

  return (
    <div className="surface-card p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
          Recent Trades
        </div>
        <Link
          to="/trades"
          className="text-xs text-champagne hover:text-champagne/80 transition-colors"
        >
          View all →
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-soft">
          No trades yet.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {recent.map((t) => {
            const pnl = t.pnl ?? 0;
            const isPos = pnl >= 0;
            const date = new Date(t.trade_date).toLocaleDateString();
            const dir = (t.direction || "").toUpperCase();
            return (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="size-8 rounded-md bg-surface-2 border border-border/60 flex items-center justify-center shrink-0">
                  <Activity
                    className={cn("size-3.5", isPos ? "text-pos" : "text-neg")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">
                    {t.pair}
                    <span className="text-faint"> · </span>
                    <span className="text-soft">{dir}</span>
                  </div>
                  <div className="text-xs text-faint mt-0.5">
                    {date}
                    {t.session ? ` · ${t.session}` : ""}
                  </div>
                </div>
                <div
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    t.pnl == null ? "text-faint" : isPos ? "text-pos" : "text-neg",
                  )}
                >
                  {t.pnl == null ? "—" : fmtMoney(pnl, { sign: true })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}