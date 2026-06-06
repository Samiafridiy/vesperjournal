import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Trade } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";

export function WinLossSplit({ trades }: { trades: Trade[] }) {
  const { wins, losses, winRate } = useMemo(() => {
    const closed = trades.filter((t) => t.pnl != null);
    const w = closed.filter((t) => (t.pnl ?? 0) > 0).length;
    const l = closed.filter((t) => (t.pnl ?? 0) < 0).length;
    const total = w + l;
    return { wins: w, losses: l, winRate: total ? w / total : 0 };
  }, [trades]);

  const total = wins + losses;
  const R = 56;
  const C = 2 * Math.PI * R;
  const winLen = total ? (wins / total) * C : 0;
  const lossLen = total ? (losses / total) * C : 0;

  return (
    <div
      className={cn(
        "surface-card p-5 flex flex-col h-full hover-glow",
        total === 0
          ? "hover-glow-champagne"
          : winRate >= 0.5
          ? "hover-glow-pos"
          : "hover-glow-neg",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium mb-4">
        Win / Loss Split
      </div>
      <div className="flex-1 flex items-center justify-center py-2">
        <div className="relative size-[180px]">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90">
            <circle cx="70" cy="70" r={R} stroke="var(--border)" strokeWidth="14" fill="none" />
            {total > 0 && (
              <>
                <motion.circle
                  cx="70"
                  cy="70"
                  r={R}
                  stroke="var(--pos)"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  fill="none"
                  initial={{ strokeDasharray: `0 ${C}` }}
                  animate={{ strokeDasharray: `${winLen} ${C - winLen}` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.circle
                  cx="70"
                  cy="70"
                  r={R}
                  stroke="var(--neg)"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  fill="none"
                  initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -winLen }}
                  animate={{ strokeDasharray: `${lossLen} ${C - lossLen}`, strokeDashoffset: -winLen }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {total ? `${Math.round(winRate * 100)}%` : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint mt-1">Win rate</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-pos" />
          <span className="text-soft">Wins</span>
          <span className="font-mono tabular-nums">{wins}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-neg" />
          <span className="text-soft">Losses</span>
          <span className="font-mono tabular-nums">{losses}</span>
        </div>
      </div>
    </div>
  );
}