import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SAMPLE_DAYS = [
  { day: 1, pnl: 120 },
  { day: 2, pnl: -45 },
  { day: 3, pnl: 0 },
  { day: 4, pnl: 230 },
  { day: 5, pnl: -80 },
  { day: 6, pnl: 0 },
  { day: 7, pnl: 65 },
  { day: 8, pnl: -120 },
  { day: 9, pnl: 340 },
  { day: 10, pnl: 0 },
  { day: 11, pnl: -30 },
  { day: 12, pnl: 180 },
  { day: 13, pnl: 0 },
  { day: 14, pnl: 95 },
  { day: 15, pnl: -60 },
  { day: 16, pnl: 410 },
  { day: 17, pnl: 0 },
  { day: 18, pnl: -150 },
  { day: 19, pnl: 275 },
  { day: 20, pnl: 0 },
  { day: 21, pnl: 55 },
];

function compactMoney(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs}`;
}

export function HeroCalendarPreview() {
  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="size-1.5 rounded-full bg-champagne" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium">
          Monthly P&L
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-[9px] uppercase tracking-[0.14em] text-faint font-medium text-center py-1"
          >
            {d.slice(0, 1)}
          </div>
        ))}

        {SAMPLE_DAYS.map((d) => {
          const isPos = d.pnl > 0;
          const isNeg = d.pnl < 0;
          return (
            <div
              key={d.day}
              className={cn(
                "aspect-square rounded-md border p-1 flex flex-col justify-between transition-colors",
                "border-border bg-surface-2",
                isPos && "bg-pos/[0.08] border-pos/20",
                isNeg && "bg-neg/[0.08] border-neg/20",
              )}
            >
              <span className="text-[9px] font-mono text-faint leading-none">{d.day}</span>
              {d.pnl !== 0 && (
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums font-medium leading-none text-center",
                    isPos && "text-pos",
                    isNeg && "text-neg",
                  )}
                >
                  {compactMoney(d.pnl)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
