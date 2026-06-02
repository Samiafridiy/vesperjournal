import { Clock } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { bestSessionInsight } from "@/lib/intervention";

export function SessionInsight({ trades }: { trades: Trade[] }) {
  const best = bestSessionInsight(trades);
  if (!best) return null;
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className="size-9 rounded-md bg-champagne/10 border border-champagne/30 flex items-center justify-center">
        <Clock className="size-4 text-champagne" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint">Session Awareness</div>
        <div className="text-sm text-foreground mt-0.5">
          You perform better in <span className="text-champagne font-medium">{best.session}</span>
          <span className="text-soft"> · {(best.winRate * 100).toFixed(0)}% win rate ({best.sample} trades)</span>
        </div>
      </div>
    </div>
  );
}