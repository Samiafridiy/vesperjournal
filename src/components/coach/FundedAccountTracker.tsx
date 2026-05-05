import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/trade-utils";
import { useRiskPresets } from "@/hooks/use-risk";
import { useTrades } from "@/hooks/use-trades";
import type { Trade } from "@/lib/trade-utils";
import {
  computeFundedMetrics,
  accountTypeBadge,
  type FundedMetrics,
} from "@/lib/funded-account";

/** Returns the active funded preset (default or first funded one), if any. */
function useFundedMetrics(tradesProp?: Trade[]): FundedMetrics | null {
  const { presets, defaultPreset } = useRiskPresets();
  const fallback = useTrades();
  const trades = tradesProp ?? fallback.trades;
  return useMemo(() => {
    const preset =
      (defaultPreset && defaultPreset.funded_enabled ? defaultPreset : null) ??
      presets.find((p) => p.funded_enabled) ??
      null;
    return computeFundedMetrics(preset, trades);
  }, [presets, defaultPreset, trades]);
}

export function FundedAlertBanner({ trades }: { trades?: Trade[] } = {}) {
  const m = useFundedMetrics(trades);
  if (!m) return null;
  const showDaily = m.dailyAlert;
  const showDD = m.drawdownAlert;
  const showDeadline = m.deadlineAlert;
  if (!showDaily && !showDD && !showDeadline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-neg/40 bg-neg/10 p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center"
    >
      <ShieldAlert className="size-5 text-neg shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-neg">
          {m.dailyStop ? "STOP TRADING — Daily loss limit hit" : "Funded account at risk"}
        </div>
        <ul className="text-xs text-soft mt-1 space-y-0.5">
          {showDaily && (
            <li>• Daily loss {Math.round(m.dailyUsedPct)}% of {fmtMoney(m.dailyLimit ?? 0)} used</li>
          )}
          {showDD && (
            <li>• Max drawdown {Math.round(m.drawdownUsedPct)}% of {fmtMoney(m.maxDrawdown ?? 0)} used</li>
          )}
          {showDeadline && (
            <li>• Challenge deadline in {m.daysRemaining} day{m.daysRemaining === 1 ? "" : "s"}</li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}

export function FundedAccountTracker({ trades }: { trades?: Trade[] } = {}) {
  const m = useFundedMetrics(trades);
  if (!m) return null;

  const badge = accountTypeBadge(m.type);
  const statusMeta = {
    on_track: { label: "On Track", className: "bg-pos/10 border-pos/30 text-pos" },
    at_risk: { label: "At Risk", className: "bg-champagne/10 border-champagne/30 text-champagne" },
    danger: { label: "Danger", className: "bg-neg/10 border-neg/30 text-neg" },
  }[m.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium">
            Funded Tracker
          </span>
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wider", badge.className)}>
            {badge.label}
          </span>
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wider", statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-faint">
          {m.minTradingDays != null && (
            <span>Trading days: <span className="text-soft font-mono">{m.tradingDaysCompleted}/{m.minTradingDays}</span></span>
          )}
          {m.daysRemaining != null && (
            <span>Days left: <span className={cn("font-mono", m.daysRemaining >= 0 && m.daysRemaining <= 3 ? "text-champagne" : "text-soft")}>{m.daysRemaining < 0 ? "Expired" : m.daysRemaining}</span></span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {m.profitTarget != null && (
          <MiniBar
            label="Profit Target"
            colorClass="bg-[color:var(--pos)]/70"
            current={Math.max(0, m.totalPnl)}
            max={m.profitTarget}
            pct={m.profitProgressPct}
          />
        )}
        {m.maxDrawdown != null && (
          <MiniBar
            label="Max Drawdown"
            colorClass="bg-[#B07A1A]"
            current={m.drawdownRemaining ?? 0}
            max={m.maxDrawdown}
            pct={100 - m.drawdownUsedPct}
            subText={`${fmtMoney(m.drawdownRemaining ?? 0)} left`}
          />
        )}
        {m.dailyLimit != null && (
          <MiniBar
            label="Daily Loss"
            colorClass="bg-[#3A6BB0]"
            current={m.dailyRemaining ?? 0}
            max={m.dailyLimit}
            pct={100 - m.dailyUsedPct}
            subText={`${fmtMoney(m.dailyRemaining ?? 0)} left`}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Link to="/trading-lab" className="text-[10px] text-soft hover:text-champagne transition-colors">
          Manage →
        </Link>
      </div>
    </motion.div>
  );
}

function MiniBar({
  label, current, max, pct, colorClass, subText,
}: {
  label: string;
  current: number;
  max: number;
  pct: number;
  colorClass: string;
  subText?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-soft">
          {subText ?? `${fmtMoney(current)} / ${fmtMoney(max)}`}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}