import type { Database } from "@/integrations/supabase/types";
import type { Trade } from "@/lib/trade-utils";

export type RiskPreset = Database["public"]["Tables"]["risk_presets"]["Row"];

export type AccountType = "personal" | "challenge_p1" | "challenge_p2" | "funded_live";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  personal: "Personal",
  challenge_p1: "Challenge P1",
  challenge_p2: "Challenge P2",
  funded_live: "Funded Live",
};

export function accountTypeBadge(t: AccountType | string | null | undefined): {
  label: string;
  className: string;
} {
  const type = (t ?? "personal") as AccountType;
  switch (type) {
    case "funded_live":
      return { label: "Live", className: "bg-pos/15 border-pos/40 text-pos" };
    case "challenge_p1":
      return { label: "Challenge P1", className: "bg-champagne/15 border-champagne/40 text-champagne" };
    case "challenge_p2":
      return { label: "Challenge P2", className: "bg-champagne/15 border-champagne/40 text-champagne" };
    default:
      return { label: "Personal", className: "bg-accent border-border text-soft" };
  }
}

/** Sum of P&L for trades since the start of the local day. */
export function todaysPnl(trades: Trade[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return trades
    .filter((t) => new Date(t.trade_date) >= start)
    .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
}

/** Sum of P&L for all trades on/after a starting balance snapshot date (or all-time). */
export function totalPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
}

/** Distinct dates with at least one trade. */
export function tradingDaysCount(trades: Trade[]): number {
  const set = new Set<string>();
  for (const t of trades) set.add(new Date(t.trade_date).toDateString());
  return set.size;
}

export function daysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export type FundedStatus = "on_track" | "at_risk" | "danger";

export interface FundedMetrics {
  enabled: boolean;
  type: AccountType;
  startingBalance: number;
  currentEquity: number;
  totalPnl: number;
  todayPnl: number;
  // Profit target
  profitTarget: number | null;
  profitProgressPct: number; // 0..100
  // Max drawdown
  maxDrawdown: number | null;
  drawdownUsed: number; // dollars lost from start (positive number)
  drawdownRemaining: number | null;
  drawdownUsedPct: number; // 0..100
  // Daily loss limit
  dailyLimit: number | null;
  dailyUsed: number; // positive number when down
  dailyRemaining: number | null;
  dailyUsedPct: number;
  // Trading days
  minTradingDays: number | null;
  tradingDaysCompleted: number;
  // Deadline
  deadline: string | null;
  daysRemaining: number | null;
  // Status
  status: FundedStatus;
  // Alert flags (drive red banner)
  dailyAlert: boolean; // ≥80%
  dailyStop: boolean; // ≥100%
  drawdownAlert: boolean; // ≥70%
  deadlineAlert: boolean; // ≤3 days
}

export function computeFundedMetrics(preset: RiskPreset | null | undefined, trades: Trade[]): FundedMetrics | null {
  if (!preset || !preset.funded_enabled) return null;

  const startingBalance = Number(preset.starting_balance ?? 0);
  const total = totalPnl(trades);
  const today = todaysPnl(trades);
  const equity = startingBalance + total;

  const profitTarget = preset.profit_target != null ? Number(preset.profit_target) : null;
  const profitProgressPct = profitTarget && profitTarget > 0
    ? clamp((Math.max(0, total) / profitTarget) * 100, 0, 100)
    : 0;

  const maxDrawdown = preset.max_drawdown_amount != null ? Number(preset.max_drawdown_amount) : null;
  const drawdownUsed = Math.max(0, -total); // positive when in drawdown
  const drawdownRemaining = maxDrawdown != null ? Math.max(0, maxDrawdown - drawdownUsed) : null;
  const drawdownUsedPct = maxDrawdown && maxDrawdown > 0 ? clamp((drawdownUsed / maxDrawdown) * 100, 0, 100) : 0;

  const dailyLimit = preset.daily_loss_limit != null ? Number(preset.daily_loss_limit) : null;
  const dailyUsed = Math.max(0, -today);
  const dailyRemaining = dailyLimit != null ? Math.max(0, dailyLimit - dailyUsed) : null;
  const dailyUsedPct = dailyLimit && dailyLimit > 0 ? clamp((dailyUsed / dailyLimit) * 100, 0, 100) : 0;

  const minTradingDays = preset.min_trading_days != null ? Number(preset.min_trading_days) : null;
  const tradingDaysCompleted = tradingDaysCount(trades);

  const deadline = preset.challenge_deadline ?? null;
  const daysRemaining = daysUntil(deadline);

  const dailyAlert = dailyUsedPct >= 80;
  const dailyStop = dailyUsedPct >= 100;
  const drawdownAlert = drawdownUsedPct >= 70;
  const deadlineAlert = daysRemaining != null && daysRemaining <= 3 && daysRemaining >= 0;

  let status: FundedStatus = "on_track";
  if (dailyStop || drawdownUsedPct >= 90) status = "danger";
  else if (dailyAlert || drawdownAlert || deadlineAlert) status = "at_risk";

  return {
    enabled: true,
    type: (preset.account_type ?? "personal") as AccountType,
    startingBalance,
    currentEquity: equity,
    totalPnl: total,
    todayPnl: today,
    profitTarget,
    profitProgressPct,
    maxDrawdown,
    drawdownUsed,
    drawdownRemaining,
    drawdownUsedPct,
    dailyLimit,
    dailyUsed,
    dailyRemaining,
    dailyUsedPct,
    minTradingDays,
    tradingDaysCompleted,
    deadline,
    daysRemaining,
    status,
    dailyAlert,
    dailyStop,
    drawdownAlert,
    deadlineAlert,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Risk per trade based on max drawdown (not full balance). */
export function fundedRiskPerTrade(preset: RiskPreset): number | null {
  if (!preset.funded_enabled || preset.max_drawdown_amount == null) return null;
  const dd = Number(preset.max_drawdown_amount);
  const pct = Number(preset.risk_pct ?? 0) / 100;
  return dd * pct;
}

/** How many losing trades (at risk-per-trade $) until a $ limit is breached. */
export function tradesUntilBreach(riskPerTrade: number, limit: number): number {
  if (riskPerTrade <= 0 || limit <= 0) return 0;
  return Math.floor(limit / riskPerTrade);
}