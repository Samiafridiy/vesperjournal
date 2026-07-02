import type { Trade } from "@/lib/trade-utils";
import {
  computeViolations,
  type TradingRule,
  type RuleViolation,
  parseRule,
  ruleSummary,
} from "@/lib/rule-engine";
import { qualityTag } from "@/lib/trade-tags";

export type LetterGrade = "A" | "B" | "C" | "D" | "F";

export type RuleAdherence = {
  ruleId: string;
  ruleText: string;
  summary: string;
  violated: boolean;
  count: number;
};

export type SessionReview = {
  date: string;                   // YYYY-MM-DD
  trades: Trade[];
  score: number;                  // 0-100
  grade: LetterGrade;
  tradesTaken: number;
  winRate: number;                // 0..1 (wins / decided)
  netPnl: number;
  adherence: RuleAdherence[];
  poorEntries: number;
  noSlCount: number;
  overLimit: boolean;
  biggestIssue: string | null;
  breakdown: {
    rulePenalty: number;
    limitPenalty: number;
    noSlPenalty: number;
    poorEntryPenalty: number;
  };
};

const DEFAULT_DAILY_LIMIT = 3;

function toDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gradeFor(score: number): LetterGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Build today's session review from all trades + active rules. */
export function computeSessionReview(
  trades: Trade[],
  rules: TradingRule[],
  opts: { dailyLimit?: number; day?: Date } = {},
): SessionReview {
  const day = opts.day ?? new Date();
  const dayKey = toDayKey(day.toISOString());
  const dailyLimit = opts.dailyLimit ?? DEFAULT_DAILY_LIMIT;

  const todays = trades.filter((t) => toDayKey(t.trade_date) === dayKey);

  // Violations for today only. We still pass full trade history so
  // the engine can evaluate ordering-based rules (e.g. cooldown).
  const activeRules = rules.filter((r) => r.active);
  const allViolations = computeViolations(trades, activeRules);
  const todaysViolations = allViolations.filter(
    (v: RuleViolation) => toDayKey(v.tradeDate) === dayKey,
  );

  // Adherence per active rule.
  const countsByRule = new Map<string, number>();
  for (const v of todaysViolations) {
    countsByRule.set(v.ruleId, (countsByRule.get(v.ruleId) ?? 0) + 1);
  }
  const adherence: RuleAdherence[] = activeRules.map((r) => {
    const count = countsByRule.get(r.id) ?? 0;
    const parsed = parseRule(r.text);
    return {
      ruleId: r.id,
      ruleText: r.text,
      summary: parsed.kind === "manual" ? r.text : ruleSummary(parsed),
      violated: count > 0,
      count,
    };
  });

  const rulePenalty = adherence.filter((a) => a.violated).length * 15;

  const overLimit = todays.length > dailyLimit;
  const limitPenalty = overLimit ? 10 : 0;

  const noSlTrades = todays.filter((t) => t.stop_loss == null);
  const noSlPenalty = noSlTrades.length > 0 ? 20 : 0;

  const poorEntries = todays.filter((t) => qualityTag(t)?.label === "Poor-entry").length;
  const poorEntryPenalty = poorEntries * 10;

  const score = Math.max(0, 100 - rulePenalty - limitPenalty - noSlPenalty - poorEntryPenalty);

  const decided = todays.filter((t) => t.result === "win" || t.result === "loss").length;
  const wins = todays.filter((t) => t.result === "win").length;
  const netPnl = todays.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Biggest issue: rule with the most violations today; fall back to
  // structural issues if no rule was broken.
  let biggestIssue: string | null = null;
  const worstAdherence = [...adherence]
    .filter((a) => a.violated)
    .sort((a, b) => b.count - a.count)[0];
  if (worstAdherence) {
    biggestIssue = worstAdherence.summary;
  } else if (noSlTrades.length > 0) {
    biggestIssue = "No stop loss on some trades";
  } else if (overLimit) {
    biggestIssue = `Exceeded daily trade limit (${dailyLimit})`;
  } else if (poorEntries > 0) {
    biggestIssue = "Poor entries — plan not followed on losses";
  }

  return {
    date: dayKey,
    trades: todays,
    score,
    grade: gradeFor(score),
    tradesTaken: todays.length,
    winRate: decided > 0 ? wins / decided : 0,
    netPnl,
    adherence,
    poorEntries,
    noSlCount: noSlTrades.length,
    overLimit,
    biggestIssue,
    breakdown: { rulePenalty, limitPenalty, noSlPenalty, poorEntryPenalty },
  };
}

export function gradeToneClass(grade: LetterGrade): string {
  if (grade === "A" || grade === "B") return "text-pos";
  if (grade === "C") return "text-champagne";
  return "text-neg";
}