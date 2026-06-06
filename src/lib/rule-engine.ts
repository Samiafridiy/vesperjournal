import type { Trade } from "@/lib/trade-utils";

export type TradingRule = {
  id: string;
  user_id: string;
  text: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ParsedRule =
  | { kind: "max_trades_per_day"; n: number }
  | { kind: "no_after_n_losses"; n: number }
  | { kind: "cooldown_after_loss"; minutes: number }
  | { kind: "no_day"; day: number } // 0=Sun..6=Sat
  | { kind: "no_day_after_time"; day: number | null; hour: number }
  | { kind: "only_sessions"; sessions: string[] }
  | { kind: "only_pairs"; pairs: string[] }
  | { kind: "manual" };

const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const SESSION_WORDS = ["asia", "tokyo", "london", "new york", "newyork", "ny"];

function normalizeSession(w: string): string | null {
  const s = w.toLowerCase();
  if (s.includes("asia") || s.includes("tokyo")) return "Asia";
  if (s.includes("london")) return "London";
  if (s.includes("new york") || s.includes("newyork") || s === "ny") return "New York";
  return null;
}

export function parseRule(text: string): ParsedRule {
  const t = text.toLowerCase().trim();

  // "max 3 trades per day" / "maximum 3 trades a day" / "no more than 3 trades per day"
  let m = t.match(/(?:max(?:imum)?|no more than)\s+(\d+)\s+trades?\s+(?:per|a|\/)\s*day/);
  if (m) return { kind: "max_trades_per_day", n: Number(m[1]) };

  // "no trading after 2 losses in a day" / "stop after 2 losses"
  m = t.match(/(?:no\s+trad(?:ing|es?)|stop)\s+after\s+(\d+)\s+loss/);
  if (m) return { kind: "no_after_n_losses", n: Number(m[1]) };

  // "no trades within 20 min(utes) of a loss" / "wait 30 minutes after a loss"
  m = t.match(/(?:wait|no trades?\s+(?:within|for))\s+(\d+)\s*(?:min|minute)/);
  if (m) return { kind: "cooldown_after_loss", minutes: Number(m[1]) };

  // "no trades on friday after 3pm"
  m = t.match(/no\s+trades?\s+(?:on\s+)?(\w+)\s+after\s+(\d{1,2})\s*(am|pm)?/);
  if (m) {
    const day = DAY_NAMES[m[1]] ?? null;
    let hour = Number(m[2]);
    const mer = m[3];
    if (mer === "pm" && hour < 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
    return { kind: "no_day_after_time", day, hour };
  }

  // "no trades on friday"
  m = t.match(/no\s+trad(?:ing|es?)\s+(?:on\s+)?(\w+)/);
  if (m && DAY_NAMES[m[1]] != null) return { kind: "no_day", day: DAY_NAMES[m[1]] };

  // "only trade london and new york session" / "only trade london, ny"
  m = t.match(/only\s+trad(?:e|ing)\s+(.+?)(?:\s+sessions?|$)/);
  if (m) {
    const tail = m[1];
    const sessions = Array.from(new Set(
      tail.split(/,| and | & |\+/g).map((p) => normalizeSession(p.trim())).filter(Boolean) as string[],
    ));
    if (sessions.length > 0) return { kind: "only_sessions", sessions };

    // could be pairs e.g. "only trade xauusd and eurusd"
    const pairs = Array.from(new Set(
      tail.split(/,| and | & |\+/g)
        .map((p) => p.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter((p) => /^[A-Z]{3,8}$/.test(p)),
    ));
    if (pairs.length > 0) return { kind: "only_pairs", pairs };
  }

  return { kind: "manual" };
}

export function ruleSummary(rule: ParsedRule): string {
  switch (rule.kind) {
    case "max_trades_per_day": return `Max ${rule.n} trades per day`;
    case "no_after_n_losses": return `Stop after ${rule.n} losses in a day`;
    case "cooldown_after_loss": return `Wait ${rule.minutes} min after a loss`;
    case "no_day": return `No trading on day ${rule.day}`;
    case "no_day_after_time": return `No trades on day ${rule.day} after ${rule.hour}:00`;
    case "only_sessions": return `Only trade ${rule.sessions.join(", ")}`;
    case "only_pairs": return `Only trade ${rule.pairs.join(", ")}`;
    case "manual": return "Manual rule";
  }
}

/** Does a given trade violate a parsed rule, given the user's prior trades? */
export function tradeViolatesRule(
  trade: Trade,
  parsed: ParsedRule,
  priorTrades: Trade[],
): boolean {
  if (parsed.kind === "manual") return false;
  const tradeAt = new Date(trade.trade_date);
  const dayKey = tradeAt.toDateString();
  const sameDay = priorTrades.filter(
    (t) => new Date(t.trade_date).toDateString() === dayKey,
  );

  switch (parsed.kind) {
    case "max_trades_per_day":
      return sameDay.length + 1 > parsed.n;
    case "no_after_n_losses": {
      const losses = sameDay.filter((t) => t.result === "loss").length;
      return losses >= parsed.n;
    }
    case "cooldown_after_loss": {
      const recentLoss = sameDay
        .filter((t) => t.result === "loss")
        .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())[0];
      if (!recentLoss) return false;
      const gapMin = (tradeAt.getTime() - new Date(recentLoss.trade_date).getTime()) / 60000;
      return gapMin >= 0 && gapMin < parsed.minutes;
    }
    case "no_day":
      return tradeAt.getDay() === parsed.day;
    case "no_day_after_time":
      if (parsed.day != null && tradeAt.getDay() !== parsed.day) return false;
      return tradeAt.getHours() >= parsed.hour;
    case "only_sessions":
      return !!trade.session && !parsed.sessions.includes(trade.session);
    case "only_pairs":
      return !parsed.pairs.includes(trade.pair.toUpperCase());
  }
}

export type RuleViolation = {
  ruleId: string;
  ruleText: string;
  tradeId: string;
  tradePnl: number;
  tradeDate: string;
};

/** Find every violation across all trades for the given rules. */
export function computeViolations(
  trades: Trade[],
  rules: TradingRule[],
): RuleViolation[] {
  const active = rules.filter((r) => r.active);
  const parsed = active.map((r) => ({ rule: r, parsed: parseRule(r.text) }));
  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );
  const out: RuleViolation[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const prior = sorted.slice(0, i);
    for (const { rule, parsed: p } of parsed) {
      if (tradeViolatesRule(trade, p, prior)) {
        out.push({
          ruleId: rule.id,
          ruleText: rule.text,
          tradeId: trade.id,
          tradePnl: trade.pnl ?? 0,
          tradeDate: trade.trade_date,
        });
      }
    }
  }
  return out;
}

export type RuleViolationSummary = {
  ruleId: string;
  ruleText: string;
  count: number;
  totalPnl: number;
};

export function summarizeViolations(violations: RuleViolation[]): RuleViolationSummary[] {
  const map = new Map<string, RuleViolationSummary>();
  for (const v of violations) {
    const existing = map.get(v.ruleId);
    if (existing) {
      existing.count++;
      existing.totalPnl += v.tradePnl;
    } else {
      map.set(v.ruleId, {
        ruleId: v.ruleId,
        ruleText: v.ruleText,
        count: 1,
        totalPnl: v.tradePnl,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/** Monday-start week key (YYYY-MM-DD) for a given date. */
export function weekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
}

export function violationsThisWeek(violations: RuleViolation[]): RuleViolation[] {
  const start = weekStart(new Date()).getTime();
  return violations.filter((v) => new Date(v.tradeDate).getTime() >= start);
}