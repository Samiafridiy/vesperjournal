import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { useRules } from "@/hooks/use-rules";
import {
  computeViolations,
  parseRule,
  ruleSummary,
  tradeViolatesRule,
} from "@/lib/rule-engine";
import { getDailyLimit } from "@/lib/intervention";
import { fmtMoney, fmtPct } from "@/lib/trade-utils";
import type { Trade } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";
import { EmptyHint } from "@/components/EmptyHint";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function letterGrade(score: number): { grade: string; tone: "pos" | "champagne" | "neg" } {
  if (score >= 90) return { grade: "A", tone: "pos" };
  if (score >= 80) return { grade: "B", tone: "pos" };
  if (score >= 70) return { grade: "C", tone: "champagne" };
  if (score >= 60) return { grade: "D", tone: "champagne" };
  return { grade: "F", tone: "neg" };
}

export function TodaySessionReview({ trades }: { trades: Trade[] }) {
  const { rules } = useRules();
  const dailyLimit = getDailyLimit();

  const todayTrades = useMemo(
    () => trades.filter((t) => isToday(t.trade_date)),
    [trades],
  );

  const activeRules = useMemo(() => rules.filter((r) => r.active), [rules]);

  const { violationsToday, perRuleViolatedToday } = useMemo(() => {
    const all = computeViolations(trades, rules);
    const today = all.filter((v) => isToday(v.tradeDate));
    const perRule = new Map<string, number>();
    for (const v of today) perRule.set(v.ruleId, (perRule.get(v.ruleId) ?? 0) + 1);
    return { violationsToday: today, perRuleViolatedToday: perRule };
  }, [trades, rules]);

  const overLimit = todayTrades.length > dailyLimit;
  const missingSL = todayTrades.some((t) => t.stop_loss == null);

  const score = Math.max(
    0,
    100 - violationsToday.length * 15 - (overLimit ? 10 : 0) - (missingSL ? 20 : 0),
  );
  const { grade, tone } = letterGrade(score);

  const wins = todayTrades.filter((t) => t.result === "win").length;
  const losses = todayTrades.filter((t) => t.result === "loss").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? wins / decided : 0;
  const netPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Biggest issue: rule with most violations today
  let biggestIssue: string | null = null;
  if (perRuleViolatedToday.size > 0) {
    let topId = "";
    let topN = 0;
    for (const [id, n] of perRuleViolatedToday) {
      if (n > topN) {
        topN = n;
        topId = id;
      }
    }
    const rule = activeRules.find((r) => r.id === topId);
    if (rule) biggestIssue = rule.text;
  }

  // Adherence: for each active rule, determine if violated today
  const adherence = activeRules.map((r) => ({
    id: r.id,
    text: r.text,
    parsedSummary: (() => {
      const p = parseRule(r.text);
      return p.kind === "manual" ? r.text : ruleSummary(p);
    })(),
    violated: (perRuleViolatedToday.get(r.id) ?? 0) > 0,
  }));

  return (
    <div className="surface-card-elevated top-accent p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="size-2 bg-champagne rounded-full glow-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
          Today's Session Review
        </span>
      </div>

      {todayTrades.length === 0 ? (
        <EmptyHint
          title="No trades logged today"
          description="At the end of each trading day this grades your session — how well you stuck to your rules, your win rate and your net result."
          actionLabel="Log today's trade"
          actionTo="/trade/new"
        />
      ) : (
      <>
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
        <div
          className={cn(
            "size-24 rounded-2xl border flex flex-col items-center justify-center shrink-0",
            tone === "pos" && "border-pos/30 bg-pos/10",
            tone === "champagne" && "border-champagne/30 bg-champagne/10",
            tone === "neg" && "border-neg/30 bg-neg/10",
          )}
        >
          <div
            className={cn(
              "font-mono text-4xl font-semibold leading-none",
              tone === "pos" && "text-pos",
              tone === "champagne" && "text-champagne",
              tone === "neg" && "text-neg",
            )}
          >
            {grade}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-soft mt-1">
            {score}/100
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 flex-1 w-full">
          <StatPill label="Trades" value={String(todayTrades.length)} />
          <StatPill
            label="Win rate"
            value={decided > 0 ? fmtPct(winRate) : "—"}
          />
          <StatPill
            label="Net P&L"
            value={fmtMoney(netPnl, { sign: true })}
            tone={netPnl > 0 ? "pos" : netPnl < 0 ? "neg" : "neutral"}
          />
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium mb-3">
          Rule adherence
        </div>
        {adherence.length === 0 ? (
          <div className="text-xs text-soft">No active rules in your Rule Book.</div>
        ) : (
          <ul className="space-y-2">
            {adherence.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-2.5 text-sm"
              >
                {r.violated ? (
                  <span className="size-5 rounded-md bg-neg/15 border border-neg/30 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="size-3 text-neg" />
                  </span>
                ) : (
                  <span className="size-5 rounded-md bg-pos/15 border border-pos/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="size-3 text-pos" />
                  </span>
                )}
                <span
                  className={cn(
                    "leading-tight",
                    r.violated ? "text-foreground" : "text-soft",
                  )}
                >
                  {r.parsedSummary}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {biggestIssue && (
        <div className="rounded-lg border border-champagne/25 bg-champagne/10 px-3 py-2 text-xs text-champagne">
          Biggest issue today: {biggestIssue}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium">
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-lg font-medium tabular-nums leading-none",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
        )}
      >
        {value}
      </div>
    </div>
  );
}