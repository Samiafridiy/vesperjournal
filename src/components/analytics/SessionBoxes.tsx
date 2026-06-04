import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";
import { useMemo } from "react";

const SESSION_DEFS = [
  { key: "London", label: "London", match: (s: string) => s === "London" },
  { key: "New York", label: "New York", match: (s: string) => s === "New York" },
  { key: "Asia", label: "Asian", match: (s: string) => s === "Asia" || s === "Asian" },
  {
    key: "Overlap",
    label: "London / NY Overlap",
    match: (s: string) => s === "Overlap" || s === "London/NY" || s === "London/NY Overlap",
  },
];

export function SessionBoxes({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    return SESSION_DEFS.map((def) => {
      const subset = trades.filter(
        (t) => t.pnl != null && t.session && def.match(t.session),
      );
      const pnl = subset.reduce((a, b) => a + (b.pnl ?? 0), 0);
      return { ...def, pnl, n: subset.length };
    });
  }, [trades]);

  return (
    <div className="surface-card p-6">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
          P&L by Session
        </div>
        <div className="text-xs text-soft mt-0.5">Where your edge lives across the clock</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const empty = s.n === 0;
          const isPos = s.pnl > 0;
          const isNeg = s.pnl < 0;
          return (
            <div
              key={s.key}
              className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-1"
            >
              <div className="text-xs text-soft">{s.label}</div>
              <div
                className={
                  "font-mono text-lg tabular-nums " +
                  (empty ? "text-faint" : isPos ? "text-pos" : isNeg ? "text-neg" : "text-soft")
                }
              >
                {empty ? "—" : fmtMoney(s.pnl, { sign: true })}
              </div>
              <div className="text-[11px] text-faint">
                {s.n} trade{s.n === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}