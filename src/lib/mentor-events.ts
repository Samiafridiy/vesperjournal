import type { Trade } from "./trade-utils";

export type MentorEventKey =
  | "revenge"
  | "overtrading"
  | "hesitant_winner"
  | "broken_rule"
  | "discipline_streak";

export type MentorEvent = {
  key: MentorEventKey;
  title: string;
  /** Plain-language description the AI will reference as the Observation. */
  observation: string;
  /** Stable id (event + date) used to throttle prompts. */
  signature: string;
  tone: "warn" | "good";
};

/** Detect the single most meaningful behavioral event from recent trades, or null. */
export function detectMentorEvent(trades: Trade[]): MentorEvent | null {
  const closed = trades
    .filter((t) => t.result === "win" || t.result === "loss" || t.result === "breakeven")
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
  if (closed.length === 0) return null;

  const today = new Date().toDateString();

  // 1. Revenge — a trade within 15 min of a prior loss
  for (let i = 0; i < closed.length - 1; i++) {
    const t = closed[i];
    const prev = closed[i + 1];
    if (prev.result !== "loss") continue;
    const gap = new Date(t.trade_date).getTime() - new Date(prev.trade_date).getTime();
    if (gap > 0 && gap <= 15 * 60 * 1000) {
      return {
        key: "revenge",
        title: "Possible revenge trade",
        observation: `You entered ${t.pair} only ${Math.round(gap / 60000)} minutes after a losing trade on ${prev.pair}.`,
        signature: `revenge:${t.id}`,
        tone: "warn",
      };
    }
  }

  // 2. Overtrading — more than 5 trades today
  const todayTrades = closed.filter((t) => new Date(t.trade_date).toDateString() === today);
  if (todayTrades.length >= 5) {
    return {
      key: "overtrading",
      title: "Overtrading detected",
      observation: `You placed ${todayTrades.length} trades today — well above a focused trading session.`,
      signature: `overtrading:${today}`,
      tone: "warn",
    };
  }

  // 3. Hesitant winner — recent win closed well below 1R
  const recentWin = closed.find((t) => t.result === "win");
  if (recentWin && (recentWin.rr ?? 0) > 0 && (recentWin.rr ?? 0) < 0.7) {
    return {
      key: "hesitant_winner",
      title: "Closed a winner early",
      observation: `Your last win on ${recentWin.pair} closed at ${(recentWin.rr ?? 0).toFixed(2)}R — short of a full target.`,
      signature: `hesitant:${recentWin.id}`,
      tone: "warn",
    };
  }

  // 4. Broken rule — a loss with a tagged mistake
  const brokenRule = closed.find(
    (t) => t.result === "loss" && Array.isArray(t.mistakes) && t.mistakes.length > 0,
  );
  if (brokenRule) {
    return {
      key: "broken_rule",
      title: "Rule was broken",
      observation: `You tagged "${brokenRule.mistakes![0]}" on your recent loss in ${brokenRule.pair}.`,
      signature: `broken:${brokenRule.id}`,
      tone: "warn",
    };
  }

  // 5. Discipline streak — 3+ consecutive wins with followed_plan true
  let streak = 0;
  for (const t of closed) {
    if (t.result === "win" && t.followed_plan) streak += 1;
    else break;
  }
  if (streak >= 3) {
    return {
      key: "discipline_streak",
      title: "Disciplined streak",
      observation: `You followed your plan on ${streak} consecutive winning trades.`,
      signature: `streak:${today}:${streak}`,
      tone: "good",
    };
  }

  return null;
}

const DISMISS_KEY = "vesper.mentorDismissed";

export function isDismissed(signature: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return JSON.parse(raw).includes(signature);
  } catch {
    return false;
  }
}

export function dismiss(signature: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(signature)) list.push(signature);
    // Keep last 50
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* noop */
  }
}