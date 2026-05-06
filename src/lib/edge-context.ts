import type { Trade } from "./trade-utils";

export type EdgeStats = {
  sample: number;
  winRate: number; // 0..100
  avgRR: number;
  netPnl: number;
  suggestion: string;
};

export type OverallEdge = {
  bestPair: { pair: string; avgPnl: number; winRate: number; sample: number } | null;
  bestSession: { session: string; winRate: number; avgPnl: number; sample: number } | null;
  highRR: { winRate: number; sample: number } | null;
  current: {
    label: string;
    winRate: number | null;
    sample: number;
    needs: number; // trades needed to reach 3
  };
  emotion: {
    bestName: string;
    bestWin: number;
    worstName: string;
    worstWin: number;
  } | null;
};

/** Compute trader's overall edge across ALL trades (90d). Always returns useful info. */
export function computeOverallEdge(
  trades: Trade[],
  pair: string,
  session: string | null | undefined,
): OverallEdge {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const closed = trades.filter(
    (t) => t.pnl != null && new Date(t.trade_date).getTime() >= cutoff,
  );

  // Best pair (by avg pnl, min 3 trades)
  const byPair = new Map<string, Trade[]>();
  closed.forEach((t) => {
    const arr = byPair.get(t.pair) ?? [];
    arr.push(t);
    byPair.set(t.pair, arr);
  });
  let bestPair: OverallEdge["bestPair"] = null;
  for (const [p, arr] of byPair) {
    if (arr.length < 3) continue;
    const avg = arr.reduce((a, b) => a + (b.pnl ?? 0), 0) / arr.length;
    const wins = arr.filter((t) => t.result === "win").length;
    const wr = (wins / arr.length) * 100;
    if (!bestPair || avg > bestPair.avgPnl) {
      bestPair = { pair: p, avgPnl: avg, winRate: wr, sample: arr.length };
    }
  }

  // Best session
  const bySess = new Map<string, Trade[]>();
  closed.forEach((t) => {
    if (!t.session) return;
    const arr = bySess.get(t.session) ?? [];
    arr.push(t);
    bySess.set(t.session, arr);
  });
  let bestSession: OverallEdge["bestSession"] = null;
  for (const [s, arr] of bySess) {
    if (arr.length < 3) continue;
    const wins = arr.filter((t) => t.result === "win").length;
    const wr = (wins / arr.length) * 100;
    const avg = arr.reduce((a, b) => a + (b.pnl ?? 0), 0) / arr.length;
    if (!bestSession || wr > bestSession.winRate) {
      bestSession = { session: s, winRate: wr, avgPnl: avg, sample: arr.length };
    }
  }

  // High RR (>=2)
  const high = closed.filter((t) => (t.rr ?? 0) >= 2);
  let highRR: OverallEdge["highRR"] = null;
  if (high.length >= 3) {
    const wins = high.filter((t) => t.result === "win").length;
    highRR = { winRate: (wins / high.length) * 100, sample: high.length };
  }

  // Current setup (pair + session)
  const cur = closed.filter(
    (t) => t.pair === pair && (session ? t.session === session : true),
  );
  let curWin: number | null = null;
  if (cur.length >= 3) {
    const wins = cur.filter((t) => t.result === "win").length;
    curWin = (wins / cur.length) * 100;
  }
  const current = {
    label: `${pair}${session ? ` · ${session}` : ""}`,
    winRate: curWin,
    sample: cur.length,
    needs: Math.max(0, 3 - cur.length),
  };

  // Emotion best vs worst
  const byEmo = new Map<string, Trade[]>();
  closed.forEach((t) => {
    if (!t.emotion_before) return;
    const arr = byEmo.get(t.emotion_before) ?? [];
    arr.push(t);
    byEmo.set(t.emotion_before, arr);
  });
  const emoStats = Array.from(byEmo.entries())
    .filter(([, arr]) => arr.length >= 3)
    .map(([name, arr]) => {
      const wins = arr.filter((t) => t.result === "win").length;
      return { name, win: (wins / arr.length) * 100 };
    });
  let emotion: OverallEdge["emotion"] = null;
  if (emoStats.length >= 2) {
    const sorted = [...emoStats].sort((a, b) => b.win - a.win);
    emotion = {
      bestName: sorted[0].name,
      bestWin: sorted[0].win,
      worstName: sorted[sorted.length - 1].name,
      worstWin: sorted[sorted.length - 1].win,
    };
  }

  return { bestPair, bestSession, highRR, current, emotion };
}

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