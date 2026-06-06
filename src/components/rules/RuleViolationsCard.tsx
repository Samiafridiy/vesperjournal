import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";
import { useRules } from "@/hooks/use-rules";
import { computeViolations, summarizeViolations } from "@/lib/rule-engine";
import { cn } from "@/lib/utils";

export function RuleViolationsCard({ trades }: { trades: Trade[] }) {
  const { rules } = useRules();

  const { rows, totalCount, totalPnl } = useMemo(() => {
    const violations = computeViolations(trades, rules);
    const rows = summarizeViolations(violations);
    const totalCount = violations.length;
    const totalPnl = violations.reduce((s, v) => s + v.tradePnl, 0);
    return { rows, totalCount, totalPnl };
  }, [trades, rules]);

  const activeRules = rules.filter((r) => r.active).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface-card p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {totalCount > 0 ? (
            <ShieldAlert className="size-4 text-neg" />
          ) : (
            <ShieldCheck className="size-4 text-pos" />
          )}
          <span className={cn(
            "text-[11px] uppercase tracking-[0.18em] font-medium",
            totalCount > 0 ? "text-neg" : "text-soft",
          )}>
            Rule Violations
          </span>
        </div>
        <div className="text-[11px] text-faint">{activeRules} active rule{activeRules === 1 ? "" : "s"}</div>
      </div>

      {activeRules === 0 ? (
        <div className="text-sm text-soft">
          You haven't set any rules yet. Open the Rule Book to add a few.
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-pos/20 bg-pos/5 p-4">
          <ShieldCheck className="size-5 text-pos shrink-0" />
          <div>
            <div className="text-sm font-medium text-pos">Clean run</div>
            <div className="text-xs text-soft mt-0.5">No rule violations in the selected range.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-2 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-faint">
                  <th className="text-left font-medium px-2 py-2">Rule</th>
                  <th className="text-right font-medium px-2 py-2">Times broken</th>
                  <th className="text-right font-medium px-2 py-2">Total cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ruleId} className="border-t border-border/60">
                    <td className="px-2 py-3 text-foreground">{r.ruleText}</td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums">{r.count}</td>
                    <td className={cn(
                      "px-2 py-3 text-right font-mono tabular-nums",
                      r.totalPnl >= 0 ? "text-pos" : "text-neg",
                    )}>
                      {fmtMoney(r.totalPnl, { sign: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={cn(
            "rounded-lg p-3 border text-sm",
            totalPnl >= 0 ? "border-pos/20 bg-pos/5" : "border-neg/25 bg-neg/10",
          )}>
            Breaking your rules cost{" "}
            <span className={cn("font-mono font-medium", totalPnl >= 0 ? "text-pos" : "text-neg")}>
              {fmtMoney(totalPnl, { sign: true })}
            </span>{" "}
            across {totalCount} trade{totalCount === 1 ? "" : "s"}.
          </div>
        </>
      )}
    </motion.div>
  );
}