import { useMemo } from "react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";

/**
 * GitHub-style P&L heatmap for the last ~16 weeks.
 * Green = profit day, red = loss day, opacity reflects magnitude.
 */
export function CalendarHeatmap({ trades }: { trades: Trade[] }) {
  const { weeks, max } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const t of trades) {
      if (t.pnl == null) continue;
      const key = t.trade_date.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + (t.pnl ?? 0));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start from Sunday 16 weeks ago
    const totalDays = 16 * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1));
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const days: { date: Date; key: string; pnl: number }[] = [];
    const cur = new Date(start);
    while (cur <= today) {
      const key = cur.toISOString().slice(0, 10);
      days.push({ date: new Date(cur), key, pnl: byDay.get(key) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    const max = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return { weeks, max };
  }, [trades]);

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day) => {
            const isFuture = day.date.getTime() > Date.now();
            const intensity = Math.min(1, Math.abs(day.pnl) / max);
            const isPos = day.pnl > 0;
            const isNeg = day.pnl < 0;
            const bg = isFuture
              ? "transparent"
              : isPos
              ? `color-mix(in oklab, var(--pos) ${15 + intensity * 75}%, transparent)`
              : isNeg
              ? `color-mix(in oklab, var(--neg) ${15 + intensity * 75}%, transparent)`
              : "var(--surface-2)";
            return (
              <div
                key={day.key}
                title={`${day.key}: ${fmtMoney(day.pnl, { sign: true })}`}
                className="size-3 rounded-[3px] border border-border/40 transition-transform hover:scale-150 hover:z-10"
                style={{ background: bg, visibility: isFuture ? "hidden" : "visible" }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}