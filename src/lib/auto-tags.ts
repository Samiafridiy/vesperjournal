import type { Trade } from "@/lib/trade-utils";

export type AutoTag = {
  label: string;
  tone: "pos" | "neg" | "champagne" | "neutral";
};

/**
 * Derive display-only tags from an existing trade row.
 * Duration uses `updated_at - trade_date` as a proxy for time-in-trade,
 * only when the trade has a close price (i.e. it's closed).
 */
export function autoTagsFor(t: Trade): AutoTag[] {
  const tags: AutoTag[] = [];

  // Duration
  if (t.close_price != null && t.trade_date && t.updated_at) {
    const openedAt = new Date(t.trade_date).getTime();
    const closedAt = new Date(t.updated_at).getTime();
    const mins = (closedAt - openedAt) / 60000;
    if (Number.isFinite(mins) && mins >= 0) {
      if (mins < 5) tags.push({ label: "Scalp", tone: "neutral" });
      else if (mins <= 30) tags.push({ label: "Short-hold", tone: "neutral" });
      else tags.push({ label: "Swing", tone: "neutral" });
    }
  }

  // Quality
  const isWin = t.result === "win";
  const isLoss = t.result === "loss";
  const followed = t.followed_plan === true;
  const hasStop = t.stop_loss != null;
  if (isWin && followed && hasStop) {
    tags.push({ label: "Clean-entry", tone: "pos" });
  } else if (isWin && !followed) {
    tags.push({ label: "Lucky-entry", tone: "champagne" });
  } else if (isLoss && !followed) {
    tags.push({ label: "Poor-entry", tone: "neg" });
  }

  // Behavior — first mistake only
  const firstMistake = t.mistakes?.[0];
  if (firstMistake) tags.push({ label: firstMistake, tone: "neg" });

  return tags;
}