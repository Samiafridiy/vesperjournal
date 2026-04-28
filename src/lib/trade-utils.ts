import type { Database } from "@/integrations/supabase/types";

export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

export const PAIRS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF",
  "NZDUSD", "EURJPY", "GBPJPY", "BTCUSD", "ETHUSD", "NAS100", "US30", "SPX500",
];
export const SESSIONS = ["London", "New York", "Asia", "Sydney"] as const;
export const EMOTIONS_BEFORE = ["Confident", "Fear", "Greed", "Neutral"] as const;
export const EMOTIONS_AFTER = ["Confident", "Fear", "Greed", "Neutral", "Satisfied", "Frustrated"] as const;
export const MISTAKES = ["Overtrading", "FOMO", "Early entry", "No stop loss", "Revenge trading", "Moved stop", "Closed early"] as const;

/**
 * Pip value approximation for forex-style PnL.
 * For simplicity we use a generic point-based formula that works for most pairs:
 *   pnl = (close - entry) * lot_size * contract_size * direction_multiplier
 * where contract_size is 100,000 for forex majors. JPY pairs use 1,000 points.
 */
function contractSize(pair: string): number {
  if (pair.includes("JPY")) return 1000;
  if (["XAUUSD"].includes(pair)) return 100;
  if (["BTCUSD", "ETHUSD"].includes(pair)) return 1;
  if (["NAS100", "US30", "SPX500"].includes(pair)) return 1;
  return 100000;
}

export function calcPnl(opts: {
  pair: string;
  direction: "buy" | "sell";
  entry: number;
  close: number | null | undefined;
  lot: number;
}): number | null {
  if (opts.close == null) return null;
  const sign = opts.direction === "buy" ? 1 : -1;
  return (opts.close - opts.entry) * opts.lot * contractSize(opts.pair) * sign;
}

export function calcRR(opts: {
  direction: "buy" | "sell";
  entry: number;
  stop: number | null | undefined;
  takeProfit?: number | null;
  close?: number | null;
}): number | null {
  if (opts.stop == null) return null;
  // Directional risk/reward. Always returned as a positive ratio.
  //  BUY:  risk = entry - stop,    reward = tp - entry
  //  SELL: risk = stop  - entry,   reward = entry - tp
  const risk = opts.direction === "buy"
    ? opts.entry - opts.stop
    : opts.stop - opts.entry;
  if (risk <= 0) return null;
  const target = opts.takeProfit ?? opts.close;
  if (target == null) return null;
  const reward = opts.direction === "buy"
    ? target - opts.entry
    : opts.entry - target;
  return Number((Math.abs(reward) / risk).toFixed(2));
}

export function calcResult(pnl: number | null): "win" | "loss" | "breakeven" | null {
  if (pnl == null) return null;
  if (pnl > 0.0001) return "win";
  if (pnl < -0.0001) return "loss";
  return "breakeven";
}

export function fmtMoney(n: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefix = opts.sign ? (n >= 0 ? "+$" : "−$") : (n < 0 ? "−$" : "$");
  return `${prefix}${formatted}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/* ========== Smart insights ========== */

export type Insight = {
  tone: "warn" | "good" | "neutral";
  title: string;
  detail: string;
};

export function generateInsights(trades: Trade[]): Insight[] {
  const closed = trades.filter((t) => t.pnl != null);
  const insights: Insight[] = [];
  if (closed.length < 5) {
    insights.push({
      tone: "neutral",
      title: "Log a few more trades to unlock insights",
      detail: `${closed.length} closed trade${closed.length === 1 ? "" : "s"} so far. Insights become meaningful past ~10 trades.`,
    });
    return insights;
  }

  // Best / worst session
  const bySession: Record<string, number[]> = {};
  for (const t of closed) {
    if (!t.session || t.pnl == null) continue;
    (bySession[t.session] ??= []).push(t.pnl);
  }
  const sessionAgg = Object.entries(bySession).map(([s, arr]) => ({
    session: s,
    total: arr.reduce((a, b) => a + b, 0),
    n: arr.length,
  }));
  if (sessionAgg.length >= 2) {
    const worst = [...sessionAgg].sort((a, b) => a.total - b.total)[0];
    if (worst.total < 0 && worst.n >= 3) {
      insights.push({
        tone: "warn",
        title: `You lose more in the ${worst.session} session`,
        detail: `${fmtMoney(worst.total, { sign: true })} over ${worst.n} trades. Consider sitting out or tightening rules.`,
      });
    }
    const best = [...sessionAgg].sort((a, b) => b.total - a.total)[0];
    if (best.total > 0) {
      insights.push({
        tone: "good",
        title: `${best.session} is your strongest session`,
        detail: `${fmtMoney(best.total, { sign: true })} across ${best.n} trades. Lean into it.`,
      });
    }
  }

  // Best pair
  const byPair: Record<string, number> = {};
  for (const t of closed) {
    byPair[t.pair] = (byPair[t.pair] ?? 0) + (t.pnl ?? 0);
  }
  const pairs = Object.entries(byPair).sort((a, b) => b[1] - a[1]);
  if (pairs.length && pairs[0][1] > 0) {
    insights.push({
      tone: "good",
      title: `Best performing pair: ${pairs[0][0]}`,
      detail: `${fmtMoney(pairs[0][1], { sign: true })} cumulative.`,
    });
  }

  // Most common mistake
  const mistakeCount: Record<string, { count: number; pnl: number }> = {};
  for (const t of closed) {
    for (const m of t.mistakes ?? []) {
      const e = (mistakeCount[m] ??= { count: 0, pnl: 0 });
      e.count += 1;
      e.pnl += t.pnl ?? 0;
    }
  }
  const topMistake = Object.entries(mistakeCount).sort((a, b) => b[1].count - a[1].count)[0];
  if (topMistake && topMistake[1].count >= 2) {
    insights.push({
      tone: "warn",
      title: `Most common mistake: ${topMistake[0]}`,
      detail: `Tagged on ${topMistake[1].count} trades, costing ${fmtMoney(topMistake[1].pnl, { sign: true })}.`,
    });
  }

  // RR insight
  const highRR = closed.filter((t) => (t.rr ?? 0) >= 2);
  const lowRR = closed.filter((t) => (t.rr ?? 0) < 1 && (t.rr ?? 0) > 0);
  if (highRR.length >= 3 && lowRR.length >= 3) {
    const highWin = highRR.filter((t) => t.result === "win").length / highRR.length;
    const lowWin = lowRR.filter((t) => t.result === "win").length / lowRR.length;
    if (highWin > lowWin + 0.1) {
      insights.push({
        tone: "good",
        title: "Your best trades have R:R above 2",
        detail: `Win rate ${(highWin * 100).toFixed(0)}% on ≥2R setups vs ${(lowWin * 100).toFixed(0)}% on <1R.`,
      });
    }
  }

  // Emotion impact
  const fearPnl = closed.filter((t) => t.emotion_before === "Fear").reduce((a, b) => a + (b.pnl ?? 0), 0);
  const greedPnl = closed.filter((t) => t.emotion_before === "Greed").reduce((a, b) => a + (b.pnl ?? 0), 0);
  const confidentPnl = closed.filter((t) => t.emotion_before === "Confident").reduce((a, b) => a + (b.pnl ?? 0), 0);
  if (greedPnl < 0 && Math.abs(greedPnl) > 50) {
    insights.push({
      tone: "warn",
      title: "Trading on Greed costs you",
      detail: `${fmtMoney(greedPnl, { sign: true })} from trades entered with Greed emotion.`,
    });
  }
  if (confidentPnl > Math.max(fearPnl, greedPnl, 0)) {
    insights.push({
      tone: "good",
      title: "You perform best when Confident",
      detail: `${fmtMoney(confidentPnl, { sign: true })} from confident entries — your A-game state.`,
    });
  }

  return insights.slice(0, 5);
}

export function computeStats(trades: Trade[]) {
  const closed = trades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => t.result === "win");
  const losses = closed.filter((t) => t.result === "loss");
  const totalPnl = closed.reduce((a, b) => a + (b.pnl ?? 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgRR = closed.length
    ? closed.reduce((a, b) => a + (b.rr ?? 0), 0) / closed.length
    : 0;
  const grossProfit = wins.reduce((a, b) => a + (b.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + (b.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = closed.length
    ? (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss
    : 0;

  // Best / worst single trade
  const bestTrade = closed.reduce((a, b) => ((b.pnl ?? 0) > (a?.pnl ?? -Infinity) ? b : a), closed[0] ?? null);
  const worstTrade = closed.reduce((a, b) => ((b.pnl ?? 0) < (a?.pnl ?? Infinity) ? b : a), closed[0] ?? null);

  // Max drawdown from equity curve
  const sorted = [...closed].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );
  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  for (const t of sorted) {
    cum += t.pnl ?? 0;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDD) maxDD = dd;
  }

  // Streak — count consecutive same-result from most recent
  const byDate = [...closed].sort(
    (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime(),
  );
  let streak = 0;
  let streakType: "win" | "loss" | null = null;
  for (const t of byDate) {
    const r = t.result;
    if (r !== "win" && r !== "loss") continue;
    if (streakType == null) {
      streakType = r;
      streak = 1;
    } else if (r === streakType) {
      streak += 1;
    } else break;
  }

  return {
    total: trades.length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    totalPnl,
    avgRR,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    bestTrade,
    worstTrade,
    maxDrawdown: maxDD,
    streak,
    streakType,
  };
}

export function equityCurve(trades: Trade[]) {
  const sorted = [...trades]
    .filter((t) => t.pnl != null)
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  let cum = 0;
  return sorted.map((t, i) => {
    cum += t.pnl ?? 0;
    return {
      i: i + 1,
      date: t.trade_date,
      pnl: t.pnl,
      equity: cum,
    };
  });
}