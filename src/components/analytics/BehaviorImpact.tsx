import { useMemo } from "react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";

const PATTERNS: { key: string; label: string; match: (t: Trade) => boolean }[] = [
  {
    key: "revenge",
    label: "Revenge trading",
    match: (t) =>
      (t.mistakes ?? []).includes("Revenge trading") || t.emotion_before === "Revenge",
  },
  {
    key: "no-sl",
    label: "Trading without stop loss",
    match: (t) => (t.mistakes ?? []).includes("No stop loss") || t.stop_loss == null,
  },
  {
    key: "overtrading",
    label: "Overtrading",
    match: (t) => (t.mistakes ?? []).includes("Overtrading"),
  },
  {
    key: "fomo",
    label: "FOMO entry",
    match: (t) => (t.mistakes ?? []).includes("FOMO") || t.emotion_before === "FOMO",
  },
  {
    key: "emotional",
    label: "Emotional trade",
    match: (t) =>
      ["Greed", "Fear", "Anxious", "Rushed"].includes(t.emotion_before ?? ""),
  },
];

export function BehaviorImpact({ trades }: { trades: Trade[] }) {
  const { rows, monthCost } = useMemo(() => {
    const closed = trades.filter((t) => t.pnl != null);
    const rows = PATTERNS.map((p) => {
      const subset = closed.filter(p.match);
      const losses = subset.filter((t) => (t.pnl ?? 0) < 0);
      const total = subset.reduce((a, b) => a + (b.pnl ?? 0), 0);
      const avgLoss = losses.length
        ? losses.reduce((a, b) => a + (b.pnl ?? 0), 0) / losses.length
        : 0;
      return { ...p, n: subset.length, avgLoss, total };
    });

    // Cost this calendar month — sum of negative pnl from any trade matching any pattern
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const seen = new Set<string>();
    let monthCost = 0;
    for (const t of closed) {
      if (new Date(t.trade_date).getTime() < monthStart) continue;
      if (!PATTERNS.some((p) => p.match(t))) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      if ((t.pnl ?? 0) < 0) monthCost += t.pnl ?? 0;
    }
    return { rows, monthCost };
  }, [trades]);

  return (
    <div className="surface-card p-6">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
          Behavior Impact
        </div>
        <div className="text-xs text-soft mt-0.5">
          What your patterns are actually costing you
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-faint border-b border-border">
              <th className="py-2 pr-4 font-medium">Pattern</th>
              <th className="py-2 px-4 font-medium text-right">Detected</th>
              <th className="py-2 px-4 font-medium text-right">Avg loss / occurrence</th>
              <th className="py-2 pl-4 font-medium text-right">Total cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const profitable = r.total > 0;
              return (
                <tr key={r.key} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4">{r.label}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-soft">
                    {r.n}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-soft">
                    {r.avgLoss < 0 ? fmtMoney(r.avgLoss, { sign: true }) : "—"}
                  </td>
                  <td
                    className={
                      "py-3 pl-4 text-right font-mono tabular-nums " +
                      (r.n === 0
                        ? "text-faint"
                        : profitable
                        ? "text-pos"
                        : "text-neg")
                    }
                  >
                    {r.n === 0 ? "—" : fmtMoney(r.total, { sign: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-soft">
        Your bad habits cost you{" "}
        <span className={"font-mono tabular-nums " + (monthCost < 0 ? "text-neg" : "text-pos")}>
          {fmtMoney(monthCost, { sign: true })}
        </span>{" "}
        this month.
      </div>
    </div>
  );
}