import type { Trade } from "@/lib/trade-utils";
import type { RiskPreset } from "@/hooks/use-risk";

export interface RiskObservation {
  id: string;
  text: string;
  tone: "pos" | "warn" | "neutral";
}

function dayKey(d: string | Date) {
  return new Date(d).toDateString();
}

/**
 * Plain-language observations derived from already-logged trades.
 * Pure read-only analysis — no new schema, no changes to risk math.
 */
export function buildRiskObservations(
  trades: Trade[],
  preset: RiskPreset | null | undefined,
  balance: number,
): RiskObservation[] {
  const out: RiskObservation[] = [];
  if (trades.length < 5) return out;

  const closed = trades.filter((t) => t.pnl != null);
  const recent = closed.slice(0, 20);
  const presetRisk = preset ? Number(preset.risk_pct) : null;

  // 1. Position size vs preset risk %
  if (presetRisk && presetRisk > 0 && balance > 0) {
    const losers = closed.filter((t) => Number(t.pnl) < 0);
    const over = losers.filter((t) => (Math.abs(Number(t.pnl)) / balance) * 100 > presetRisk * 1.25);
    if (losers.length >= 3) {
      if (over.length > 0) {
        out.push({
          id: "oversize",
          tone: "warn",
          text: `Your losses ran bigger than your ${presetRisk}% preset on ${over.length} of ${losers.length} losing trades — position sizes are drifting above plan.`,
        });
      } else {
        out.push({
          id: "sized",
          tone: "pos",
          text: `Every one of your last ${losers.length} losses stayed inside your ${presetRisk}% risk per trade. Sizing discipline is holding.`,
        });
      }
    }
  }

  // 2. Daily risk limit adherence
  const dailyLimit = preset?.max_daily_risk_pct ? Number(preset.max_daily_risk_pct) : null;
  if (dailyLimit && dailyLimit > 0 && balance > 0) {
    const byDay = new Map<string, number>();
    for (const t of closed) {
      const k = dayKey(t.trade_date);
      byDay.set(k, (byDay.get(k) ?? 0) + (Number(t.pnl) || 0));
    }
    const days = Array.from(byDay.values());
    const within = days.filter((p) => (Math.max(0, -p) / balance) * 100 <= dailyLimit).length;
    if (days.length >= 3) {
      out.push({
        id: "daily",
        tone: within === days.length ? "pos" : "warn",
        text: `You stayed inside your ${dailyLimit}% daily risk limit on ${within} of your last ${days.length} trading days.`,
      });
    }
  }

  // 3. Stop-loss usage
  const noSl = recent.filter((t) => t.stop_loss == null).length;
  if (recent.length >= 5) {
    out.push({
      id: "sl",
      tone: noSl === 0 ? "pos" : noSl > recent.length / 4 ? "warn" : "neutral",
      text:
        noSl === 0
          ? `All of your last ${recent.length} trades had a stop loss set — your downside was always defined.`
          : `${noSl} of your last ${recent.length} trades were placed without a stop loss, so the real risk on those was uncapped.`,
    });
  }

  return out.slice(0, 3);
}
