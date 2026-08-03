import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";
import { computeStreaks } from "@/components/coach/StreaksCard";
import { cn } from "@/lib/utils";

function buildPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function MomentumWidget({ trades }: { trades: Trade[] }) {
  const { recent, netPnl, points, area } = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = trades
      .filter((t) => t.pnl != null && new Date(t.trade_date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    let cum = 0;
    const series = recent.map((t) => (cum += t.pnl ?? 0));
    const netPnl = cum;

    const W = 100;
    const H = 32;
    const vals = [0, ...series];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const points = vals.map((v, i) => ({
      x: vals.length > 1 ? (i / (vals.length - 1)) * W : 0,
      y: H - ((v - min) / span) * H,
    }));
    const area =
      points.length > 1
        ? `${buildPath(points)} L${W},${H} L0,${H} Z`
        : "";

    return { recent, netPnl, points, area };
  }, [trades]);

  const streak = useMemo(() => computeStreaks(trades)[0], [trades]);
  const enough = recent.length >= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface-card p-5 flex flex-col gap-3 hover-glow hover-glow-champagne"
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          30-Day Momentum
        </span>
      </div>

      {!enough ? (
        <p className="text-xs text-soft leading-relaxed py-2">
          Your momentum will show here once you've logged a few trades this month.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-5 shrink-0">
            <div>
              <div
                className={cn(
                  "text-[26px] font-medium font-mono tabular-nums leading-none",
                  netPnl >= 0 ? "text-pos" : "text-neg",
                )}
              >
                {fmtMoney(netPnl, { sign: true })}
              </div>
              <div className="text-[11px] text-faint mt-1">this month</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-champagne" />
              <span className="text-[18px] font-medium font-mono tabular-nums leading-none text-champagne">
                {streak?.count ?? 0}
              </span>
              <span className="text-[11px] text-faint">{streak?.label ?? "Streak"}</span>
            </div>
          </div>

          <svg
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            className="w-full h-12 flex-1 pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="momentum-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--champagne)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--champagne)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {area && <path d={area} fill="url(#momentum-fill)" />}
            <path
              d={buildPath(points)}
              fill="none"
              stroke="var(--champagne)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}