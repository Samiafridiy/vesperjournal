import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Trophy, AlertTriangle, ShieldAlert, Clock, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/trade-utils";
import { useRiskPresets } from "@/hooks/use-risk";
import { useTrades } from "@/hooks/use-trades";
import {
  computeFundedMetrics,
  accountTypeBadge,
  type FundedMetrics,
} from "@/lib/funded-account";

/** Returns the active funded preset (default or first funded one), if any. */
function useFundedMetrics(): FundedMetrics | null {
  const { presets, defaultPreset } = useRiskPresets();
  const { trades } = useTrades();
  return useMemo(() => {
    const preset =
      (defaultPreset && defaultPreset.funded_enabled ? defaultPreset : null) ??
      presets.find((p) => p.funded_enabled) ??
      null;
    return computeFundedMetrics(preset, trades);
  }, [presets, defaultPreset, trades]);
}

export function FundedAlertBanner() {
  const m = useFundedMetrics();
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

export function FundedAccountTracker() {
  const m = useFundedMetrics();
  if (!m) return null;

  const badge = accountTypeBadge(m.type);
  const statusMeta = {
    on_track: { label: "On Track", className: "bg-pos/15 border-pos/40 text-pos" },
    at_risk: { label: "At Risk", className: "bg-champagne/15 border-champagne/40 text-champagne" },
    danger: { label: "Danger Zone", className: "bg-neg/15 border-neg/40 text-neg" },
  }[m.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card-elevated top-accent p-5 md:p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="size-4 text-champagne shrink-0" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
            Funded Account Tracker
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider", badge.className)}>
            {badge.label}
          </span>
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider", statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Profit target */}
      {m.profitTarget != null && (
        <Bar
          label="Profit Target"
          tone="pos"
          current={Math.max(0, m.totalPnl)}
          max={m.profitTarget}
          pct={m.profitProgressPct}
        />
      )}

      {/* Max drawdown */}
      {m.maxDrawdown != null && (
        <Bar
          label="Max Drawdown Remaining"
          tone="neg"
          current={m.drawdownRemaining ?? 0}
          max={m.maxDrawdown}
          pct={100 - m.drawdownUsedPct}
          subRight={`${Math.round(m.drawdownUsedPct)}% used`}
        />
      )}

      {/* Daily limit */}
      {m.dailyLimit != null && (
        <Bar
          label="Daily Loss Remaining"
          tone="warn"
          current={m.dailyRemaining ?? 0}
          max={m.dailyLimit}
          pct={100 - m.dailyUsedPct}
          subRight={`${Math.round(m.dailyUsedPct)}% used`}
        />
      )}

      <div className="grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
        {m.minTradingDays != null && (
          <KV
            icon={<CalendarDays className="size-3.5" />}
            label="Trading Days"
            value={`${m.tradingDaysCompleted} of ${m.minTradingDays}`}
            ok={m.tradingDaysCompleted >= m.minTradingDays}
          />
        )}
        {m.daysRemaining != null && (
          <KV
            icon={<Clock className="size-3.5" />}
            label="Days Remaining"
            value={m.daysRemaining < 0 ? "Expired" : `${m.daysRemaining}`}
            ok={m.daysRemaining > 3}
            warn={m.daysRemaining >= 0 && m.daysRemaining <= 3}
          />
        )}
      </div>

      <Link to="/trading-lab" className="text-[11px] text-champagne hover:underline self-end">
        Manage funded rules →
      </Link>
    </motion.div>
  );
}

function Bar({
  label, current, max, pct, tone, subRight,
}: {
  label: string;
  current: number;
  max: number;
  pct: number;
  tone: "pos" | "neg" | "warn";
  subRight?: string;
}) {
  const barColor =
    tone === "pos" ? "bg-pos"
    : tone === "neg" ? "bg-neg"
    : "bg-champagne";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-xs text-soft">{label}</span>
        <span className="font-mono text-xs tabular-nums">
          {fmtMoney(current)} <span className="text-faint">of {fmtMoney(max)}</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      {subRight && <div className="text-[10px] text-faint mt-1 text-right">{subRight}</div>}
    </div>
  );
}

function KV({
  icon, label, value, ok, warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-faint">
        {icon}
        {label}
      </div>
      <div className={cn(
        "font-mono text-base mt-0.5",
        ok && "text-pos",
        warn && "text-champagne",
        !ok && !warn && "text-foreground",
      )}>
        {value}
      </div>
    </div>
  );
}