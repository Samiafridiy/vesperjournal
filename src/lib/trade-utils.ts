import type { Database } from "@/integrations/supabase/types";

export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

export const PAIRS = [
  // Majors
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
  // Minors / crosses
  "EURGBP", "EURJPY", "EURCHF", "EURCAD", "EURAUD", "EURNZD",
  "GBPJPY", "GBPCHF", "GBPCAD", "GBPAUD", "GBPNZD",
  "AUDJPY", "AUDCAD", "AUDNZD", "AUDCHF",
  "NZDJPY", "NZDCAD", "NZDCHF",
  "CADJPY", "CADCHF", "CHFJPY",
  // Metals
  "XAUUSD", "XAGUSD", "XAUEUR", "XAUGBP",
  // Indices
  "US30", "US500", "SPX500", "NAS100", "UK100", "GER40", "JPN225",
  // Crypto
  "BTCUSD", "ETHUSD", "BNBUSD",
];
export const SESSIONS = ["London", "New York", "Asia", "Sydney"] as const;
export const EMOTIONS_BEFORE = [
  "Calm", "Confident", "Excited", "Anxious",
  "Rushed", "Tired", "Fear", "Greed",
  "Neutral", "FOMO", "Revenge", "Bored",
] as const;
export const EMOTIONS_AFTER = [
  "Calm", "Confident", "Excited", "Anxious",
  "Rushed", "Tired", "Fear", "Greed",
  "Neutral", "FOMO", "Revenge", "Bored",
  "Satisfied", "Frustrated",
] as const;
export const MISTAKES = [
  "Overtrading", "FOMO", "Early entry",
  "No stop loss", "Revenge trading", "Moved stop",
  "Closed early", "Sized too big", "Ignored news",
  "Broke trading plan", "Chased entry", "Late entry",
  "No confluence", "Traded against trend", "Ignored higher timeframe",
] as const;
export const WINS_WELL = [
  "Followed my plan",
  "Good entry timing",
  "Respected stop loss",
  "Waited for confirmation",
  "Good risk management",
  "Trusted my analysis",
  "Patient entry",
] as const;

/** Subtle color tokens (hex) per emotion — used for soft backgrounds & glows. */
export const EMOTION_COLORS: Record<string, string> = {
  Calm: "#3B82F6",       // soft blue
  Confident: "#22C55E",  // soft green
  Excited: "#EAB308",    // soft yellow
  Anxious: "#F97316",    // soft orange
  Rushed: "#EF6A3A",     // soft orange-red
  Tired: "#9CA3AF",      // soft grey
  Fear: "#F87171",       // soft red
  Greed: "#A855F7",      // soft purple
  Neutral: "#6B7280",    // grey
  FOMO: "#F87171",       // soft red
  Revenge: "#7F1D1D",    // dark red
  Bored: "#64748B",      // grey-blue
  Satisfied: "#10B981",  // emerald
  Frustrated: "#DC2626", // red
};

/**
 * Pip definitions per instrument. A pip is the smallest "professional" price
 * increment used by traders, NOT the broker's smallest decimal (which is a point).
 *  - Most FX:    1 pip = 0.0001
 *  - JPY pairs:  1 pip = 0.01
 *  - Gold:       1 pip = 0.10
 *  - Indices/Crypto: 1 pip = 1.0  (treated as 1 point)
 */
export function pipSize(pair: string): number {
  const p = pair.toUpperCase();
  if (p.includes("JPY")) return 0.01;
  if (p.startsWith("XAU") || p.startsWith("XAG")) return 0.1;
  if (["BTCUSD", "ETHUSD", "BNBUSD", "NAS100", "US30", "US500", "SPX500", "GER40", "UK100", "JPN225"].includes(p)) return 1;
  return 0.0001;
}

/**
 * USD value of 1 pip for 1.0 standard lot.
 * Standard lot conventions:
 *   FX (USD quote):  $10 per pip per lot  (e.g. EURUSD, GBPUSD, USDCHF*)
 *   FX JPY pairs:    ~$10 per pip per lot at typical rates (approximation)
 *   Gold (XAUUSD):   $10 per pip (100 oz × 0.10)
 *   Indices/Crypto:  $1 per point per lot  (broker dependent — sane default)
 */
export function pipValuePerLot(pair: string): number {
  const p = pair.toUpperCase();
  if (["NAS100", "US30", "US500", "SPX500", "GER40", "UK100", "JPN225", "BTCUSD", "ETHUSD", "BNBUSD"].includes(p)) return 1;
  return 10;
}

/** Pip distance between two prices for a given direction. Always positive when in profit. */
export function pipDistance(opts: {
  pair: string;
  direction: "buy" | "sell";
  from: number;
  to: number;
}): number {
  const diff = opts.direction === "buy" ? opts.to - opts.from : opts.from - opts.to;
  return diff / pipSize(opts.pair);
}

/** Absolute pip distance regardless of direction (for risk/SL distance). */
export function absPips(pair: string, a: number, b: number): number {
  return Math.abs(a - b) / pipSize(pair);
}

/**
 * Profit / Loss using pip math:
 *   pnl = pip_distance(entry → close) × pip_value_per_lot × lot
 * Returns null if close is missing.
 */
export function calcPnl(opts: {
  pair: string;
  direction: "buy" | "sell";
  entry: number;
  close: number | null | undefined;
  lot: number;
}): number | null {
  if (opts.close == null) return null;
  const pips = pipDistance({ pair: opts.pair, direction: opts.direction, from: opts.entry, to: opts.close });
  return Number((pips * pipValuePerLot(opts.pair) * opts.lot).toFixed(2));
}

/**
 * Risk / Reward computed from pip distances. Consistent with profit math:
 *   risk_pips   = |entry - stop|
 *   reward_pips = |target - entry|       target = takeProfit ?? close
 *   RR = reward_pips / risk_pips
 */
export function calcRR(opts: {
  direction: "buy" | "sell";
  entry: number;
  stop: number | null | undefined;
  takeProfit?: number | null;
  close?: number | null;
  pair?: string;
}): number | null {
  if (opts.stop == null) return null;
  const target = opts.takeProfit ?? opts.close;
  if (target == null) return null;
  const pair = opts.pair ?? "EURUSD";
  const risk = absPips(pair, opts.entry, opts.stop);
  const reward = absPips(pair, opts.entry, target);
  if (risk <= 0) return null;
  return Number((reward / risk).toFixed(2));
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
  const decided = wins.length + losses.length;
  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0;
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