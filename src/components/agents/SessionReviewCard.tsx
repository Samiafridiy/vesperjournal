import { useMemo } from "react";
import { Zap, Check, X } from "lucide-react";
import { useTrades } from "@/hooks/use-trades";
import { useRules } from "@/hooks/use-rules";
import { computeSessionReview, gradeToneClass } from "@/lib/session-review";
import { fmtMoney, fmtPct } from "@/lib/trade-utils";

export function SessionReviewCard() {
  const { trades } = useTrades();
  const { rules } = useRules();
  const review = useMemo(() => computeSessionReview(trades, rules), [trades, rules]);

  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="size-4 text-champagne shrink-0" />
          <h3 className="text-sm md:text-base font-semibold tracking-tight truncate">
            Today's Session Review
          </h3>
        </div>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className={"text-4xl font-black leading-none " + gradeToneClass(review.grade)}>
            {review.grade}
          </span>
          <span className="text-xs text-faint font-mono">{review.score}/100</span>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
        <Pill label="Trades" value={String(review.tradesTaken)} />
        <Pill label="Win rate" value={fmtPct(review.winRate)} />
        <Pill
          label="Net P&L"
          value={fmtMoney(review.netPnl, { sign: true })}
          tone={review.netPnl > 0 ? "pos" : review.netPnl < 0 ? "neg" : "neutral"}
        />
      </div>

      {/* Rule adherence */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium mb-2">
          Rule adherence
        </div>
        {review.adherence.length === 0 ? (
          <div className="text-xs text-soft border border-dashed border-border rounded-lg p-3">
            No active rules — add rules in the Rule Book to track adherence.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {review.adherence.map((a) => (
              <li
                key={a.ruleId}
                className="flex items-center gap-2.5 text-sm bg-surface border border-border rounded-lg px-3 py-2"
              >
                {a.violated ? (
                  <span className="size-5 rounded-md bg-neg/10 flex items-center justify-center shrink-0">
                    <X className="size-3.5 text-neg" />
                  </span>
                ) : (
                  <span className="size-5 rounded-md bg-pos/10 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-pos" />
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate text-foreground">{a.summary}</span>
                {a.violated && (
                  <span className="text-[10px] text-neg font-mono shrink-0">
                    ×{a.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {review.biggestIssue && (
        <div className="mt-4 text-xs text-champagne bg-champagne/5 border border-champagne/20 rounded-lg px-3 py-2">
          Biggest issue today: <span className="font-medium">{review.biggestIssue}</span>
        </div>
      )}
    </div>
  );
}

function Pill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const toneCls =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={"font-mono font-semibold text-base md:text-lg tabular-nums mt-0.5 " + toneCls}>
        {value}
      </div>
    </div>
  );
}