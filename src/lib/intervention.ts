import type { Trade } from "./trade-utils";

const EMOTIONAL_STATES = new Set([
  "Fear", "Greed", "Revenge", "FOMO", "Anxious", "Rushed", "Frustrated", "Impulsive",
]);

export type Warning = {
  key: "revenge" | "overlimit" | "emotional" | "no_sl" | "too_fast";
  title: string;
  message: string;
};

export type PreTradeContext = {
  tradeDate: Date;
  stopLoss: number | null;
  emotionBefore: string | null;
  existingTrades: Trade[];
  excludeTradeId?: string;
  dailyLimit: number;
};

export function computePreTradeWarnings(ctx: PreTradeContext): Warning[] {
  const { tradeDate, stopLoss, emotionBefore, existingTrades, excludeTradeId, dailyLimit } = ctx;
  const others = excludeTradeId
    ? existingTrades.filter((t) => t.id !== excludeTradeId)
    : existingTrades;
  const ts = tradeDate.getTime();
  const warnings: Warning[] = [];

  // Revenge: prior loss within 15 min
  const recentLoss = others.find((t) => {
    if (t.result !== "loss") return false;
    const tt = new Date(t.trade_date).getTime();
    return tt < ts && ts - tt <= 15 * 60 * 1000;
  });
  if (recentLoss) {
    warnings.push({
      key: "revenge",
      title: "Possible revenge trade",
      message: "You are trading shortly after a loss. This may be revenge trading.",
    });
  }

  // Daily limit
  const day = tradeDate.toDateString();
  const todayCount = others.filter((t) => new Date(t.trade_date).toDateString() === day).length + 1;
  if (todayCount > dailyLimit) {
    warnings.push({
      key: "overlimit",
      title: "Daily trade limit reached",
      message: `You have reached your daily trade limit (${dailyLimit}). Overtrading reduces performance.`,
    });
  }

  // Emotional state
  if (emotionBefore && EMOTIONAL_STATES.has(emotionBefore)) {
    warnings.push({
      key: "emotional",
      title: "Emotional decision",
      message: `Emotional state "${emotionBefore}" detected. Pause and reassess your setup.`,
    });
  }

  // No stop loss
  if (stopLoss == null) {
    warnings.push({
      key: "no_sl",
      title: "No stop loss",
      message: "You have not set a stop loss. Risk is undefined.",
    });
  }

  // Too-fast successive entries (<5 min after any prior trade today)
  const lastTradeTs = Math.max(
    0,
    ...others
      .map((t) => new Date(t.trade_date).getTime())
      .filter((t) => t < ts),
  );
  if (lastTradeTs > 0 && ts - lastTradeTs < 5 * 60 * 1000) {
    warnings.push({
      key: "too_fast",
      title: "Trading too fast",
      message: "You are entering trades faster than usual. Slow down and reassess.",
    });
  }

  return warnings;
}

/** Returns number of trailing losses in chronological order (most recent first). */
export function trailingLossStreak(trades: Trade[]): number {
  const closed = trades
    .filter((t) => t.result === "loss" || t.result === "win" || t.result === "breakeven")
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
  let n = 0;
  for (const t of closed) {
    if (t.result === "loss") n += 1;
    else break;
  }
  return n;
}

/* ---------- localStorage helpers (client-only) ---------- */

const COOLDOWN_KEY = "vesper.cooldownUntil";
const LIMIT_KEY = "vesper.dailyTradeLimit";

export const DEFAULT_DAILY_LIMIT = 3;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function getDailyLimit(): number {
  const s = safeStorage();
  if (!s) return DEFAULT_DAILY_LIMIT;
  const v = parseInt(s.getItem(LIMIT_KEY) ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_DAILY_LIMIT;
}

export function setDailyLimit(n: number) {
  const s = safeStorage();
  if (!s) return;
  s.setItem(LIMIT_KEY, String(Math.max(1, Math.min(50, Math.round(n)))));
}

export function getCooldownUntil(): number {
  const s = safeStorage();
  if (!s) return 0;
  const v = parseInt(s.getItem(COOLDOWN_KEY) ?? "", 10);
  if (!Number.isFinite(v)) return 0;
  if (v < Date.now()) {
    s.removeItem(COOLDOWN_KEY);
    return 0;
  }
  return v;
}

export function setCooldownMinutes(minutes: number) {
  const s = safeStorage();
  if (!s) return;
  s.setItem(COOLDOWN_KEY, String(Date.now() + minutes * 60 * 1000));
}

export function clearCooldown() {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(COOLDOWN_KEY);
}

/* ---------- Session awareness ---------- */

export function bestSessionInsight(trades: Trade[]): { session: string; winRate: number; sample: number } | null {
  const closed = trades.filter((t) => t.session && (t.result === "win" || t.result === "loss"));
  if (closed.length < 5) return null;
  const map = new Map<string, { wins: number; total: number }>();
  for (const t of closed) {
    const s = t.session as string;
    const cur = map.get(s) ?? { wins: 0, total: 0 };
    cur.total += 1;
    if (t.result === "win") cur.wins += 1;
    map.set(s, cur);
  }
  let best: { session: string; winRate: number; sample: number } | null = null;
  for (const [session, v] of map) {
    if (v.total < 3) continue;
    const wr = v.wins / v.total;
    if (!best || wr > best.winRate) best = { session, winRate: wr, sample: v.total };
  }
  return best;
}