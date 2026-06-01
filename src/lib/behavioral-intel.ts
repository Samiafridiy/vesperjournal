import type { Trade } from "./trade-utils";
import { fmtMoney } from "./trade-utils";

/* ================= Trader Archetype Engine ================= */

export type ArchetypeKey =
  | "revenge_avenger"
  | "over_trader"
  | "hesitant_winner"
  | "discipline_master";

export type Archetype = {
  key: ArchetypeKey;
  title: string;
  iconName: "flame" | "zap" | "hand" | "shield";
  explanation: string;
  rule: string;
  evidence: string;
  sampleSize: number;
};

const FALLBACK: Archetype = {
  key: "discipline_master",
  title: "The Apprentice",
  iconName: "shield",
  explanation: "Not enough data yet to assign you a trader archetype.",
  rule: "Log at least 10 closed trades to unlock your behavioral profile.",
  evidence: "",
  sampleSize: 0,
};

export function computeArchetype(trades: Trade[]): Archetype {
  const closed = trades
    .filter((t) => t.pnl != null)
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
    .slice(0, 30);
  if (closed.length < 10) return { ...FALLBACK, sampleSize: closed.length };

  // chronological for streak / revenge detection
  const chrono = [...closed].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );

  // Revenge: trades within 30 min of a loss
  let revengeCount = 0;
  for (let i = 1; i < chrono.length; i++) {
    const prev = chrono[i - 1];
    const cur = chrono[i];
    if (prev.result === "loss") {
      const gap = new Date(cur.trade_date).getTime() - new Date(prev.trade_date).getTime();
      if (gap < 30 * 60 * 1000) revengeCount += 1;
    }
  }
  const revengeScore = revengeCount / closed.length;

  // Over-trader: average trades per active day
  const byDay: Record<string, number> = {};
  for (const t of closed) {
    const d = new Date(t.trade_date).toDateString();
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const days = Object.keys(byDay).length || 1;
  const tradesPerDay = closed.length / days;
  const heavyDays = Object.values(byDay).filter((c) => c >= 5).length;

  // Hesitant winner: many "Closed early" tags, plus low avg RR on wins
  const closedEarly = closed.filter((t) => (t.mistakes ?? []).includes("Closed early")).length;
  const wins = closed.filter((t) => t.result === "win");
  const avgWinRR = wins.length
    ? wins.reduce((a, b) => a + (b.rr ?? 0), 0) / wins.length
    : 0;
  const hesitantScore =
    closedEarly / closed.length + (wins.length >= 3 && avgWinRR > 0 && avgWinRR < 1 ? 0.4 : 0);

  // Discipline master: SL coverage, no mistakes, clean
  const withStop = closed.filter((t) => t.stop_loss != null).length;
  const stopPct = withStop / closed.length;
  const cleanCount = closed.filter((t) => (t.mistakes ?? []).length === 0).length;
  const cleanPct = cleanCount / closed.length;
  const winRate = wins.length / closed.length;
  const disciplineScore = stopPct * 0.4 + cleanPct * 0.4 + Math.min(1, winRate * 1.5) * 0.2;

  const scores: { key: ArchetypeKey; value: number }[] = [
    { key: "revenge_avenger", value: revengeScore * 2.5 },
    { key: "over_trader", value: (tradesPerDay >= 4 ? 0.6 : 0) + heavyDays / Math.max(1, days) },
    { key: "hesitant_winner", value: hesitantScore },
    { key: "discipline_master", value: disciplineScore },
  ];
  scores.sort((a, b) => b.value - a.value);
  const top = scores[0];

  const sample = closed.length;

  switch (top.key) {
    case "revenge_avenger":
      return {
        key: "revenge_avenger",
        title: "The Revenge Avenger",
        iconName: "flame",
        explanation: `You tend to re-enter the market quickly after losses. ${revengeCount} of your last ${sample} trades came within 30 minutes of a losing trade.`,
        rule: "Enforce a 30-minute cooldown after every loss. Step away from the screen.",
        evidence: `${revengeCount} revenge entries detected`,
        sampleSize: sample,
      };
    case "over_trader":
      return {
        key: "over_trader",
        title: "The Over-Trader",
        iconName: "zap",
        explanation: `You average ${tradesPerDay.toFixed(1)} trades per active day across ${sample} trades. ${heavyDays} day${heavyDays === 1 ? "" : "s"} had 5+ trades.`,
        rule: "Cap yourself at 3 A+ setups per day. Quality compounds, quantity bleeds.",
        evidence: `${tradesPerDay.toFixed(1)} trades/day average`,
        sampleSize: sample,
      };
    case "hesitant_winner":
      return {
        key: "hesitant_winner",
        title: "The Hesitant Winner",
        iconName: "hand",
        explanation: `You close winners early. ${closedEarly} of your last ${sample} trades were tagged "Closed early"${avgWinRR > 0 && avgWinRR < 1 ? `, and your wins average only ${avgWinRR.toFixed(2)}R` : ""}.`,
        rule: "Let winners run to your planned target. Move your stop to breakeven, then trust it.",
        evidence: `${closedEarly} early exits · avg win ${avgWinRR.toFixed(2)}R`,
        sampleSize: sample,
      };
    case "discipline_master":
    default:
      return {
        key: "discipline_master",
        title: "The Discipline Master",
        iconName: "shield",
        explanation: `${(stopPct * 100).toFixed(0)}% of your trades had a stop loss and ${(cleanPct * 100).toFixed(0)}% had zero mistakes tagged. You follow your plan.`,
        rule: "Protect this edge. Document your rules and review them weekly.",
        evidence: `${(cleanPct * 100).toFixed(0)}% clean trades`,
        sampleSize: sample,
      };
  }
}

/* ================= Psychology × P&L Matrix ================= */

/**
 * The trades table only stores `emotion_before` (a label).
 * We derive Confidence (1-10) and Stress (1-10) proxies from each emotion
 * so we can plot a Psych × P&L heatmap without schema changes.
 */
const CONFIDENCE: Record<string, number> = {
  Confident: 9, Calm: 8, Satisfied: 8, Excited: 7, Neutral: 5,
  Greed: 6, Bored: 4, Tired: 4, Rushed: 4, FOMO: 4,
  Anxious: 3, Frustrated: 3, Fear: 2, Revenge: 3,
};
const STRESS: Record<string, number> = {
  Calm: 1, Confident: 2, Satisfied: 2, Neutral: 3, Bored: 4,
  Excited: 4, Greed: 5, Tired: 6, FOMO: 7, Rushed: 7,
  Anxious: 8, Frustrated: 8, Revenge: 9, Fear: 9,
};

export type MatrixCell = {
  x: number; // confidence bucket 0..4
  y: number; // stress bucket 0..4
  pnl: number;
  count: number;
};

export type PsychMatrix = {
  cells: MatrixCell[];
  size: number;
  maxAbs: number;
  flowZone: { x: number; y: number; pnl: number; count: number } | null;
  dangerZone: { x: number; y: number; pnl: number; count: number } | null;
  total: number;
};

export function computePsychPnlMatrix(trades: Trade[]): PsychMatrix {
  const size = 5;
  const grid: MatrixCell[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({ x, y, pnl: 0, count: 0 })),
  );

  let total = 0;
  for (const t of trades) {
    if (t.pnl == null || !t.emotion_before) continue;
    const conf = CONFIDENCE[t.emotion_before];
    const stress = STRESS[t.emotion_before];
    if (conf == null || stress == null) continue;
    // Map 1..10 → 0..4 (5 buckets)
    const x = Math.min(size - 1, Math.max(0, Math.floor((conf - 1) / 2)));
    const y = Math.min(size - 1, Math.max(0, Math.floor((stress - 1) / 2)));
    const cell = grid[y][x];
    cell.pnl += t.pnl;
    cell.count += 1;
    total += 1;
  }

  const cells = grid.flat();
  const maxAbs = Math.max(1, ...cells.map((c) => Math.abs(c.pnl)));

  let flowZone: PsychMatrix["flowZone"] = null;
  let dangerZone: PsychMatrix["dangerZone"] = null;
  for (const c of cells) {
    if (c.count < 2) continue;
    if (!flowZone || c.pnl > flowZone.pnl) flowZone = { ...c };
    if (!dangerZone || c.pnl < dangerZone.pnl) dangerZone = { ...c };
  }
  if (flowZone && flowZone.pnl <= 0) flowZone = null;
  if (dangerZone && dangerZone.pnl >= 0) dangerZone = null;

  return { cells, size, maxAbs, flowZone, dangerZone, total };
}

/* ================= Mistake Cost Tracker ================= */

export type MistakeCost = {
  key: string;
  label: string;
  cost: number; // negative number
  count: number;
  period: "week" | "month";
  periodLabel: string;
  detail: string;
};

function within(trade: Trade, sinceMs: number) {
  return new Date(trade.trade_date).getTime() >= sinceMs;
}

export function computeMistakeCosts(trades: Trade[]): MistakeCost[] {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const closed = trades.filter((t) => t.pnl != null);
  const chrono = [...closed].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );

  // Revenge trades this week — within 30min of a loss
  let revengeCost = 0;
  let revengeCount = 0;
  for (let i = 1; i < chrono.length; i++) {
    const prev = chrono[i - 1];
    const cur = chrono[i];
    if (prev.result !== "loss") continue;
    const gap = new Date(cur.trade_date).getTime() - new Date(prev.trade_date).getTime();
    if (gap >= 30 * 60 * 1000) continue;
    if (!within(cur, weekAgo)) continue;
    if ((cur.pnl ?? 0) < 0) revengeCost += cur.pnl ?? 0;
    revengeCount += 1;
  }

  // Overtrading cost this month — losses on days where you placed 5+ trades
  const byDay: Record<string, Trade[]> = {};
  for (const t of closed) {
    if (!within(t, monthAgo)) continue;
    const d = new Date(t.trade_date).toDateString();
    (byDay[d] ??= []).push(t);
  }
  let overCost = 0;
  let overCount = 0;
  for (const arr of Object.values(byDay)) {
    if (arr.length < 5) continue;
    for (const t of arr) {
      if ((t.pnl ?? 0) < 0) overCost += t.pnl ?? 0;
      overCount += 1;
    }
  }

  // Self-tagged mistakes this month
  const tagCost: Record<string, { cost: number; count: number }> = {};
  for (const t of closed) {
    if (!within(t, monthAgo)) continue;
    if ((t.pnl ?? 0) >= 0) continue;
    for (const m of t.mistakes ?? []) {
      const e = (tagCost[m] ??= { cost: 0, count: 0 });
      e.cost += t.pnl ?? 0;
      e.count += 1;
    }
  }
  const topTag = Object.entries(tagCost).sort((a, b) => a[1].cost - b[1].cost)[0];

  const out: MistakeCost[] = [];
  out.push({
    key: "revenge",
    label: "Revenge trading",
    cost: revengeCost,
    count: revengeCount,
    period: "week",
    periodLabel: "this week",
    detail:
      revengeCount === 0
        ? "No revenge trades detected — well done."
        : `${revengeCount} entr${revengeCount === 1 ? "y" : "ies"} within 30 min of a loss · ${fmtMoney(revengeCost, { sign: true })}`,
  });
  out.push({
    key: "overtrading",
    label: "Overtrading",
    cost: overCost,
    count: overCount,
    period: "month",
    periodLabel: "this month",
    detail:
      overCount === 0
        ? "No 5+ trade days — balanced volume."
        : `${overCount} trade${overCount === 1 ? "" : "s"} on heavy-volume days · ${fmtMoney(overCost, { sign: true })}`,
  });
  if (topTag && topTag[1].cost < 0) {
    out.push({
      key: `tag-${topTag[0]}`,
      label: topTag[0],
      cost: topTag[1].cost,
      count: topTag[1].count,
      period: "month",
      periodLabel: "this month",
      detail: `Tagged on ${topTag[1].count} losing trade${topTag[1].count === 1 ? "" : "s"} · ${fmtMoney(topTag[1].cost, { sign: true })}`,
    });
  }
  return out;
}