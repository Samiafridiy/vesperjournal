import type { Trade } from "./trade-utils";
import { fmtMoney } from "./trade-utils";

/* ================= AI Trader Score ================= */

export type ScoreBreakdown = {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number; // 0..1
  detail: string;
};

export type TraderScore = {
  score: number; // 0..100
  tier: "poor" | "average" | "strong";
  color: "neg" | "warn" | "pos";
  breakdown: ScoreBreakdown[];
  suggestions: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeTraderScore(trades: Trade[]): TraderScore {
  const closed = trades.filter((t) => t.pnl != null);
  const n = closed.length;

  if (n < 3) {
    return {
      score: 0,
      tier: "poor",
      color: "neg",
      breakdown: [],
      suggestions: [
        "Log at least 3 closed trades to unlock your Trader Score.",
        "Be consistent — your score grows with disciplined journaling.",
      ],
    };
  }

  // 1. Win rate consistency (target 45-65% — overly high = sample bias)
  const wins = closed.filter((t) => t.result === "win").length;
  const winRate = (wins / n) * 100;
  const winScore = winRate < 30 ? winRate * 1.5 : winRate >= 45 && winRate <= 75 ? 90 : winRate >= 30 ? 70 : 40;

  // 2. Risk/Reward
  const avgRR = closed.reduce((a, b) => a + (b.rr ?? 0), 0) / n;
  const rrScore = clamp(avgRR < 0 ? 10 : avgRR < 1 ? avgRR * 40 : avgRR < 2 ? 40 + (avgRR - 1) * 35 : avgRR < 3 ? 75 + (avgRR - 2) * 20 : 95);

  // 3. Risk management — % of trades with stop loss set
  const withStop = closed.filter((t) => t.stop_loss != null).length;
  const stopPct = (withStop / n) * 100;
  const riskScore = clamp(stopPct);

  // 4. Discipline — absence of "Moved stop" / "No stop loss" / "Closed early" mistakes
  const disciplineMistakes = ["Moved stop", "No stop loss", "Closed early"];
  const disciplineBad = closed.filter((t) => (t.mistakes ?? []).some((m) => disciplineMistakes.includes(m))).length;
  const discScore = clamp(100 - (disciplineBad / n) * 150);

  // 5. Emotional control — penalize Greed/Fear entries that lost
  const badEmotion = closed.filter(
    (t) => (t.emotion_before === "Greed" || t.emotion_before === "Fear") && t.result === "loss",
  ).length;
  const emoScore = clamp(100 - (badEmotion / n) * 140);

  // 6. Overtrading — more than 5 trades in a single day penalizes
  const byDay: Record<string, number> = {};
  for (const t of closed) {
    const d = new Date(t.trade_date).toDateString();
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const overDays = Object.values(byDay).filter((c) => c > 5).length;
  const totalDays = Object.keys(byDay).length || 1;
  const overScore = clamp(100 - (overDays / totalDays) * 200);

  const breakdown: ScoreBreakdown[] = [
    { key: "win", label: "Win rate consistency", score: winScore, weight: 0.15, detail: `${winRate.toFixed(0)}% win rate across ${n} trades` },
    { key: "rr", label: "Risk / Reward", score: rrScore, weight: 0.2, detail: `Avg R:R ${avgRR.toFixed(2)}` },
    { key: "risk", label: "Risk management", score: riskScore, weight: 0.2, detail: `${stopPct.toFixed(0)}% of trades had a stop loss` },
    { key: "discipline", label: "Discipline", score: discScore, weight: 0.15, detail: disciplineBad === 0 ? "No discipline breaches logged" : `${disciplineBad} discipline breach${disciplineBad === 1 ? "" : "es"}` },
    { key: "emotion", label: "Emotional control", score: emoScore, weight: 0.15, detail: badEmotion === 0 ? "Clean emotional state on losers" : `${badEmotion} loss${badEmotion === 1 ? "" : "es"} under Fear/Greed` },
    { key: "overtrading", label: "Overtrading", score: overScore, weight: 0.15, detail: overDays === 0 ? "Balanced trade frequency" : `${overDays} day${overDays === 1 ? "" : "s"} with >5 trades` },
  ];

  const score = Math.round(breakdown.reduce((a, b) => a + b.score * b.weight, 0));

  const tier: TraderScore["tier"] = score >= 70 ? "strong" : score >= 40 ? "average" : "poor";
  const color: TraderScore["color"] = tier === "strong" ? "pos" : tier === "average" ? "warn" : "neg";

  // Suggestions from lowest components
  const weakest = [...breakdown].sort((a, b) => a.score - b.score).slice(0, 3);
  const tips: Record<string, string> = {
    win: "Tighten entry criteria — quality setups over quantity.",
    rr: "Aim for R:R above 2. Move targets further or cut losers sooner.",
    risk: "Never trade without a stop loss. Set it before entry.",
    discipline: "Stop moving stops and closing early. Trust the plan.",
    emotion: "Skip trades entered under Fear or Greed — journal the urge instead.",
    overtrading: "Cap your trade count per day. Quality > quantity.",
  };
  const suggestions = weakest.filter((w) => w.score < 75).map((w) => tips[w.key]).filter(Boolean);

  return { score, tier, color, breakdown, suggestions };
}

/* ================= Daily Coach Feedback ================= */

export type CoachMessage = {
  tone: "good" | "warn" | "neutral";
  title: string;
  detail: string;
};

export function generateDailyCoach(trades: Trade[]): CoachMessage[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todays = trades.filter((t) => {
    const d = new Date(t.trade_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const msgs: CoachMessage[] = [];

  if (todays.length === 0) {
    msgs.push({
      tone: "neutral",
      title: "No trades logged today",
      detail: "Patience is a position. Review your plan and wait for A+ setups.",
    });
    return msgs;
  }

  const closed = todays.filter((t) => t.pnl != null);
  const pnl = closed.reduce((a, b) => a + (b.pnl ?? 0), 0);
  const losses = closed.filter((t) => t.result === "loss");
  const wins = closed.filter((t) => t.result === "win");
  const lowRR = closed.filter((t) => (t.rr ?? 0) > 0 && (t.rr ?? 0) < 1);

  if (todays.length > 5) {
    msgs.push({
      tone: "warn",
      title: "You are overtrading today",
      detail: `${todays.length} trades logged. Step away — quality beats quantity.`,
    });
  }

  if (lowRR.length >= 2) {
    msgs.push({
      tone: "warn",
      title: "Most losses come from low R:R trades",
      detail: `${lowRR.length} trades today had R:R below 1. Aim for 2R+ setups.`,
    });
  }

  if (losses.length >= 3) {
    msgs.push({
      tone: "warn",
      title: "Loss streak detected",
      detail: `${losses.length} losses today. Take a break before revenge trading creeps in.`,
    });
  }

  if (wins.length >= 2 && pnl > 0 && todays.every((t) => !(t.mistakes ?? []).length)) {
    msgs.push({
      tone: "good",
      title: "Good discipline today",
      detail: `${wins.length} wins, no mistakes logged. Keep following your plan.`,
    });
  }

  if (pnl > 0 && msgs.length === 0) {
    msgs.push({
      tone: "good",
      title: "Green day so far",
      detail: `${fmtMoney(pnl, { sign: true })} on ${closed.length} trades. Protect your gains.`,
    });
  }

  if (msgs.length === 0) {
    msgs.push({
      tone: "neutral",
      title: "Steady session",
      detail: `${todays.length} trade${todays.length === 1 ? "" : "s"} logged today. Stay process-focused.`,
    });
  }

  return msgs.slice(0, 4);
}

/* ================= Mistake Alerts ================= */

export type MistakeAlert = {
  id: string;
  severity: "high" | "medium";
  title: string;
  detail: string;
  fix: string;
};

export function detectMistakes(trades: Trade[]): MistakeAlert[] {
  const alerts: MistakeAlert[] = [];
  const closed = trades.filter((t) => t.pnl != null);
  if (closed.length === 0) return alerts;

  // 1. No stop loss
  const noStop = closed.filter((t) => t.stop_loss == null);
  if (noStop.length >= 2) {
    alerts.push({
      id: "no-stop",
      severity: "high",
      title: "Trading without a stop loss",
      detail: `${noStop.length} trades had no stop loss defined.`,
      fix: "Always set a stop before entry. No exceptions.",
    });
  }

  // 2. Overtrading — any day with >5 trades
  const byDay: Record<string, Trade[]> = {};
  for (const t of closed) {
    const d = new Date(t.trade_date).toDateString();
    (byDay[d] ??= []).push(t);
  }
  const overDays = Object.entries(byDay).filter(([, arr]) => arr.length > 5);
  if (overDays.length > 0) {
    alerts.push({
      id: "overtrading",
      severity: "medium",
      title: "Overtrading detected",
      detail: `${overDays.length} day${overDays.length === 1 ? "" : "s"} with more than 5 trades.`,
      fix: "Cap trades per day. Walk away after your limit.",
    });
  }

  // 3. Low RR trades
  const lowRR = closed.filter((t) => (t.rr ?? 0) > 0 && (t.rr ?? 0) < 1);
  if (lowRR.length >= 3) {
    alerts.push({
      id: "low-rr",
      severity: "medium",
      title: "Too many low R:R trades",
      detail: `${lowRR.length} trades had R:R below 1.`,
      fix: "Raise your minimum R:R to 1.5 or 2.",
    });
  }

  // 4. Revenge trading — trade within 30 min of a loss
  const sorted = [...closed].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  let revenge = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.result === "loss") {
      const gap = new Date(cur.trade_date).getTime() - new Date(prev.trade_date).getTime();
      if (gap < 30 * 60 * 1000) revenge += 1;
    }
  }
  if (revenge >= 2) {
    alerts.push({
      id: "revenge",
      severity: "high",
      title: "Revenge trading pattern",
      detail: `${revenge} trades entered within 30 min of a loss.`,
      fix: "Set a 30-min cooldown after any loss.",
    });
  }

  // 5. Trading after loss streak — 3+ consecutive losses then continued
  let streak = 0;
  let postStreakLosses = 0;
  for (const t of sorted) {
    if (t.result === "loss") {
      streak += 1;
    } else {
      if (streak >= 3 && t.result === "loss") postStreakLosses += 1;
      streak = 0;
    }
  }
  if (streak >= 4) {
    alerts.push({
      id: "loss-streak",
      severity: "high",
      title: "Active loss streak",
      detail: `${streak} losses in a row. Consider stepping away.`,
      fix: "Take a full day off. Review your journal before returning.",
    });
  }

  // 6. Flagged self-reported mistakes
  const selfFlagged: Record<string, number> = {};
  for (const t of closed) {
    for (const m of t.mistakes ?? []) selfFlagged[m] = (selfFlagged[m] ?? 0) + 1;
  }
  const topFlag = Object.entries(selfFlagged).sort((a, b) => b[1] - a[1])[0];
  if (topFlag && topFlag[1] >= 3) {
    alerts.push({
      id: "self-flag",
      severity: "medium",
      title: `Recurring mistake: ${topFlag[0]}`,
      detail: `Tagged on ${topFlag[1]} trades.`,
      fix: "Add a rule in your checklist to block this behavior.",
    });
  }

  return alerts;
}

/* ================= Drawdown series ================= */

export function drawdownSeries(trades: Trade[]) {
  const sorted = [...trades]
    .filter((t) => t.pnl != null)
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  let cum = 0;
  let peak = 0;
  return sorted.map((t, i) => {
    cum += t.pnl ?? 0;
    if (cum > peak) peak = cum;
    return { i: i + 1, date: t.trade_date, dd: cum - peak };
  });
}