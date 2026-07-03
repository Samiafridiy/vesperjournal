import type { Trade } from "@/lib/trade-utils";

export type TagTone = "pos" | "neg" | "warn" | "neutral";

export type TradeTag = {
  label: string;
  tone: TagTone;
  title?: string;
};

/** Approximate duration in minutes using trade_date (entry) → updated_at (close). */
export function tradeDurationMinutes(trade: Trade): number | null {
  if (trade.close_price == null) return null;
  if (!trade.trade_date || !trade.updated_at) return null;
  const start = new Date(trade.trade_date).getTime();
  const end = new Date(trade.updated_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const diff = (end - start) / 60000;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return diff;
}

export function durationTag(trade: Trade): TradeTag | null {
  const mins = tradeDurationMinutes(trade);
  if (mins == null) return null;
  if (mins < 5) return { label: "Scalp", tone: "neutral", title: `${mins.toFixed(0)}m hold` };
  if (mins <= 30) return { label: "Short-hold", tone: "neutral", title: `${mins.toFixed(0)}m hold` };
  return { label: "Swing", tone: "neutral", title: `${Math.round(mins)}m hold` };
}

export function sessionTag(trade: Trade): TradeTag | null {
  if (!trade.session) return null;
  return { label: trade.session, tone: "neutral" };
}

export function qualityTag(trade: Trade): TradeTag | null {
  const hasSL = trade.stop_loss != null;
  if (trade.result === "win" && trade.followed_plan === true && hasSL) {
    return { label: "Clean-entry", tone: "pos" };
  }
  if (trade.result === "loss" && trade.followed_plan === false) {
    return { label: "Poor-entry", tone: "neg" };
  }
  if (trade.result === "win" && trade.followed_plan === false) {
    return { label: "Lucky-entry", tone: "warn" };
  }
  return null;
}

export function behaviorTag(trade: Trade): TradeTag | null {
  const first = trade.mistakes?.[0];
  if (!first) return null;
  return { label: first, tone: "neg" };
}

export function computeTradeTags(trade: Trade): TradeTag[] {
  return [durationTag(trade), sessionTag(trade), qualityTag(trade), behaviorTag(trade)].filter(
    (t): t is TradeTag => t != null,
  );
}

export function tagToneClasses(tone: TagTone): string {
  switch (tone) {
    case "pos":
      return "bg-pos/10 text-pos border border-pos/20";
    case "neg":
      return "bg-neg/10 text-neg border border-neg/20";
    case "warn":
      return "bg-champagne/10 text-champagne border border-champagne/20";
    default:
      return "bg-surface-2 text-soft border border-border";
  }
}