import type { Trade } from "./trade-utils";

export type BehaviorFlag = "revenge_trade" | "no_stop_loss" | "overtrading" | "emotional";

const EMOTIONAL_STATES = new Set(["Fear", "Greed", "Revenge", "FOMO", "Anxious", "Rushed", "Frustrated"]);

/**
 * Detect behavior flags for a candidate trade given the user's existing trades.
 * - revenge_trade: entered within 30 minutes after a losing trade
 * - no_stop_loss: stop_loss is missing
 * - overtrading: 5+ trades (including this one) on the same calendar day
 * - emotional: emotion_before is a high-arousal negative state
 */
export function detectBehaviorFlags(opts: {
  tradeDate: Date;
  stopLoss: number | null;
  emotionBefore: string | null;
  existingTrades: Trade[];
  excludeTradeId?: string;
}): BehaviorFlag[] {
  const { tradeDate, stopLoss, emotionBefore, existingTrades, excludeTradeId } = opts;
  const flags: BehaviorFlag[] = [];
  const others = excludeTradeId
    ? existingTrades.filter((t) => t.id !== excludeTradeId)
    : existingTrades;

  // Revenge: previous closed trade was a loss within 30 min
  const priorLosses = others
    .filter((t) => t.result === "loss")
    .map((t) => new Date(t.trade_date).getTime())
    .filter((ts) => ts < tradeDate.getTime() && tradeDate.getTime() - ts <= 30 * 60 * 1000);
  if (priorLosses.length > 0) flags.push("revenge_trade");

  if (stopLoss == null) flags.push("no_stop_loss");

  // Overtrading: same calendar day
  const day = tradeDate.toDateString();
  const sameDay = others.filter((t) => new Date(t.trade_date).toDateString() === day).length + 1;
  if (sameDay >= 5) flags.push("overtrading");

  if (emotionBefore && EMOTIONAL_STATES.has(emotionBefore)) flags.push("emotional");

  return flags;
}

export type BehaviorFeedback = {
  tone: "good" | "warn" | "neutral";
  message: string;
};

export function buildBehaviorFeedback(opts: {
  followedPlan: boolean | null;
  flags: BehaviorFlag[];
}): BehaviorFeedback {
  const { followedPlan, flags } = opts;
  if (flags.includes("revenge_trade")) {
    return { tone: "warn", message: "This trade may be part of revenge trading behavior." };
  }
  if (flags.includes("overtrading")) {
    return { tone: "warn", message: "Heavy trading day — watch for overtrading." };
  }
  if (flags.includes("emotional")) {
    return { tone: "warn", message: "This trade shows signs of emotional decision-making." };
  }
  if (flags.includes("no_stop_loss")) {
    return { tone: "warn", message: "No stop loss set — risky behavior." };
  }
  if (followedPlan === true) {
    return { tone: "good", message: "This trade followed your plan. Keep it up." };
  }
  if (followedPlan === false) {
    return { tone: "warn", message: "This trade was outside your plan." };
  }
  return { tone: "neutral", message: "Trade logged." };
}

/* ================= Discipline Score (0–100) ================= */

export type DisciplineScore = {
  score: number;
  tier: "strong" | "average" | "needs_work";
  breakdown: { label: string; score: number }[];
  sample: number;
};

type TradeWithBehavior = Trade & {
  followed_plan?: boolean | null;
  behavior_flags?: string[] | null;
};

export function computeDisciplineScore(trades: Trade[]): DisciplineScore {
  const withBehavior = trades as TradeWithBehavior[];
  // Use last 30 trades for a recency-weighted view
  const recent = [...withBehavior]
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
    .slice(0, 30);
  const n = recent.length;
  if (n === 0) {
    return { score: 0, tier: "needs_work", breakdown: [], sample: 0 };
  }

  // 1. Plan adherence — % of trades where followed_plan === true (ignoring nulls)
  const planTagged = recent.filter((t) => t.followed_plan != null);
  const planScore = planTagged.length
    ? (planTagged.filter((t) => t.followed_plan === true).length / planTagged.length) * 100
    : 60; // neutral default before any tagging

  // 2. Stop loss usage — % of trades with a stop loss
  const slScore = (recent.filter((t) => t.stop_loss != null).length / n) * 100;

  // 3. Emotional control — % of trades without an "emotional" or "revenge_trade" flag
  const cleanEmotion = recent.filter((t) => {
    const f = t.behavior_flags ?? [];
    return !f.includes("emotional") && !f.includes("revenge_trade");
  }).length;
  const emotionScore = (cleanEmotion / n) * 100;

  const score = Math.round(planScore * 0.4 + slScore * 0.3 + emotionScore * 0.3);
  const tier: DisciplineScore["tier"] =
    score >= 75 ? "strong" : score >= 50 ? "average" : "needs_work";

  return {
    score,
    tier,
    sample: n,
    breakdown: [
      { label: "Plan adherence", score: Math.round(planScore) },
      { label: "Stop loss usage", score: Math.round(slScore) },
      { label: "Emotional control", score: Math.round(emotionScore) },
    ],
  };
}