import type { Trade } from "./trade-utils";

export type EdgeStats = {
  sample: number;
  winRate: number; // 0..100
  avgRR: number;
  netPnl: number;
  suggestion: string;
};

/**
 * Compute edge for a given pair + session, restricted to the last 90 days.
 * Returns null when fewer than 3 closed trades exist for the slice.
 */
export function computeEdge(
  trades: Trade[],
  pair: string,
  session: string | null | undefined,
): EdgeStats | null {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const slice = trades.filter(
    (t) =>
      t.pair === pair &&
      (session ? t.session === session : true) &&
      t.pnl != null &&
      new Date(t.trade_date).getTime() >= cutoff,
  );
  if (slice.length < 3) return null;
  const wins = slice.filter((t) => t.result === "win").length;
  const winRate = (wins / slice.length) * 100;
  const avgRR = slice.reduce((a, b) => a + (b.rr ?? 0), 0) / slice.length;
  const netPnl = slice.reduce((a, b) => a + (b.pnl ?? 0), 0);

  let suggestion = "";
  if (winRate < 40) {
    suggestion = `Your ${pair}${session ? ` ${session}` : ""} win rate is ${winRate.toFixed(0)}% — trade carefully.`;
  } else if (winRate >= 60 && avgRR >= 1.5) {
    suggestion = `Strong edge: ${winRate.toFixed(0)}% wins at avg ${avgRR.toFixed(2)}R. Lean in.`;
  } else if (avgRR < 1) {
    suggestion = `Avg R:R only ${avgRR.toFixed(2)} — let winners run further.`;
  } else {
    suggestion = `Decent edge — ${winRate.toFixed(0)}% wins at ${avgRR.toFixed(2)}R over ${slice.length} trades.`;
  }
  return { sample: slice.length, winRate, avgRR, netPnl, suggestion };
}

export function computeRiskUsedPct(trades: Trade[], balance: number, windowDays: number): number {
  if (balance <= 0) return 0;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const slice = trades.filter(
    (t) => t.pnl != null && (t.pnl ?? 0) < 0 && new Date(t.trade_date).getTime() >= cutoff,
  );
  const lost = slice.reduce((a, b) => a + Math.abs(b.pnl ?? 0), 0);
  return (lost / balance) * 100;
}