import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { fmtMoney } from "@/lib/trade-utils";
import type { Trade } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Monday = 0 … Sunday = 6
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

function compactMoney(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function MonthlyPnlCalendar({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  // Aggregate closed-trade P&L by yyyy-mm-dd
  const pnlByDay = useMemo(() => {
    const m = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      if (t.pnl == null) continue;
      const key = ymd(new Date(t.trade_date));
      const cur = m.get(key) ?? { pnl: 0, count: 0 };
      cur.pnl += Number(t.pnl) || 0;
      cur.count += 1;
      m.set(key, cur);
    }
    return m;
  }, [trades]);

  // Build weeks (rows) for the visible month, weeks starting Monday.
  const { weeks, monthTotal } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex(first));
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - mondayIndex(last)));

    const rows: Array<Array<Date>> = [];
    const cursorDate = new Date(start);
    while (cursorDate <= end) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cursorDate));
        cursorDate.setDate(cursorDate.getDate() + 1);
      }
      rows.push(row);
    }

    let total = 0;
    for (const [key, v] of pnlByDay) {
      const [y, mo] = key.split("-").map(Number);
      if (y === cursor.getFullYear() && mo === cursor.getMonth() + 1) total += v.pnl;
    }

    return { weeks: rows, monthTotal: total };
  }, [cursor, pnlByDay]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function onDayClick(d: Date) {
    const key = ymd(d);
    const has = pnlByDay.has(key);
    if (has) {
      navigate({ to: "/trades", search: { date: key } });
    } else {
      navigate({ to: "/trade/new", search: { date: key } });
    }
  }

  return (
    <div className="surface-card-elevated top-accent p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="size-2 bg-champagne rounded-full glow-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
            Monthly P&amp;L
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="size-7 rounded-md border border-border bg-surface-2 hover:bg-surface flex items-center justify-center text-soft hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm font-medium tabular-nums min-w-[9rem] text-center">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="size-7 rounded-md border border-border bg-surface-2 hover:bg-surface flex items-center justify-center text-soft hover:text-foreground transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div
          className={cn(
            "font-mono text-sm tabular-nums px-3 py-1.5 rounded-md border",
            monthTotal > 0 && "text-pos border-pos/30 bg-pos/10",
            monthTotal < 0 && "text-neg border-neg/30 bg-neg/10",
            monthTotal === 0 && "text-soft border-border bg-surface-2",
          )}
        >
          Monthly: {fmtMoney(monthTotal, { sign: true })}
        </div>
      </div>

      {/* Grid header */}
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.2fr)] gap-1.5 mb-1.5">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium text-center py-1"
          >
            {d}
          </div>
        ))}
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium text-center py-1">
          Weekly
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, wi) => {
          let weekTotal = 0;
          let tradedDays = 0;
          for (const d of week) {
            const v = pnlByDay.get(ymd(d));
            if (v && d.getMonth() === cursor.getMonth()) {
              weekTotal += v.pnl;
              tradedDays += 1;
            }
          }

          return (
            <div
              key={wi}
              className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.2fr)] gap-1.5"
            >
              {week.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const v = pnlByDay.get(key);
                const isToday = isSameDay(d, today);
                const pos = v && v.pnl > 0;
                const neg = v && v.pnl < 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onDayClick(d)}
                    className={cn(
                      "relative aspect-square rounded-md border text-left p-1.5 flex flex-col transition-colors",
                      "border-border bg-surface-2 hover:bg-surface",
                      !inMonth && "opacity-40",
                      pos && "bg-pos/10 border-pos/25 hover:bg-pos/15",
                      neg && "bg-neg/10 border-neg/25 hover:bg-neg/15",
                      isToday && "ring-1 ring-champagne border-champagne/50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-mono leading-none",
                        inMonth ? "text-soft" : "text-faint",
                        isToday && "text-champagne font-semibold",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {v && inMonth && (
                      <span
                        className={cn(
                          "mt-auto self-center font-mono text-[11px] tabular-nums font-medium leading-none",
                          pos && "text-pos",
                          neg && "text-neg",
                        )}
                      >
                        {compactMoney(v.pnl)}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Weekly column */}
              <div
                className={cn(
                  "rounded-md border px-2 py-1.5 flex flex-col justify-center gap-0.5",
                  weekTotal > 0 && "border-pos/25 bg-pos/5",
                  weekTotal < 0 && "border-neg/25 bg-neg/5",
                  weekTotal === 0 && "border-border bg-surface-2",
                )}
              >
                <div className="text-[9px] uppercase tracking-[0.16em] text-faint">
                  Week total
                </div>
                <div
                  className={cn(
                    "font-mono text-xs tabular-nums font-medium leading-none",
                    weekTotal > 0 && "text-pos",
                    weekTotal < 0 && "text-neg",
                    weekTotal === 0 && "text-soft",
                  )}
                >
                  {tradedDays === 0 ? "—" : fmtMoney(weekTotal, { sign: true })}
                </div>
                <div className="text-[10px] text-faint">
                  {tradedDays} {tradedDays === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
