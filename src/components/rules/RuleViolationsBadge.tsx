import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck, BookOpen } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { useRules } from "@/hooks/use-rules";
import { computeViolations, violationsThisWeek } from "@/lib/rule-engine";
import { cn } from "@/lib/utils";

export function RuleViolationsBadge({ trades }: { trades: Trade[] }) {
  const { rules } = useRules();
  const activeRules = rules.filter((r) => r.active).length;

  const weekCount = useMemo(() => {
    if (activeRules === 0) return 0;
    return violationsThisWeek(computeViolations(trades, rules)).length;
  }, [trades, rules, activeRules]);

  const hasViolations = weekCount > 0;

  return (
    <Link
      to={activeRules === 0 ? "/rule-book" : "/analytics"}
      className="surface-card p-5 flex items-center gap-4 hover-glow hover-glow-neg block"
    >
      <div className={cn(
        "size-11 rounded-lg flex items-center justify-center shrink-0",
        activeRules === 0
          ? "bg-champagne/10 ring-1 ring-champagne/30 text-champagne"
          : hasViolations
          ? "bg-neg/15 ring-1 ring-neg/30 text-neg"
          : "bg-pos/10 ring-1 ring-pos/30 text-pos",
      )}>
        {activeRules === 0 ? <BookOpen className="size-5" /> :
         hasViolations ? <ShieldAlert className="size-5" /> :
         <ShieldCheck className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-faint font-medium">
          Rule Violations · This week
        </div>
        {activeRules === 0 ? (
          <div className="text-sm mt-1">
            No rules set yet — <span className="text-champagne">add some →</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 mt-1">
            <span className={cn(
              "font-mono text-2xl font-medium tabular-nums",
              hasViolations ? "text-neg" : "text-pos",
            )}>
              {weekCount}
            </span>
            <span className="text-xs text-soft">
              {hasViolations
                ? `violation${weekCount === 1 ? "" : "s"} this week`
                : "clean week so far"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}