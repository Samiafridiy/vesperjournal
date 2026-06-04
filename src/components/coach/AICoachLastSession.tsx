import { useMemo } from "react";
import { Bot } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";

type Row = { id: string; ok: boolean; text: string };

function buildSummary(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      paragraph: "No recent session to analyze yet. Log a few trades to surface behavioral patterns.",
      rows: [] as Row[],
    };
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime(),
  );
  const lastDay = sorted[0]?.trade_date?.slice(0, 10);
  const session = sorted
    .filter((t) => t.trade_date.slice(0, 10) === lastDay)
    .reverse(); // chronological

  const closed = session.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0).length;
  const mistakeCount = session.filter((t) => (t.mistakes?.length ?? 0) > 0).length;
  const noSL = session.filter((t) => !t.stop_loss).length;

  // Revenge pattern: trade entered <15min after a loss
  let revengeIdx: number | null = null;
  for (let i = 1; i < session.length; i++) {
    const prev = session[i - 1];
    const cur = session[i];
    if ((prev.pnl ?? 0) < 0) {
      const dt = (new Date(cur.trade_date).getTime() - new Date(prev.trade_date).getTime()) / 60000;
      if (dt >= 0 && dt < 15) {
        revengeIdx = i;
        break;
      }
    }
  }

  let paragraph = "";
  if (mistakeCount === 0 && wins >= losses) {
    paragraph = `Clean session: ${session.length} trade${session.length === 1 ? "" : "s"} with ${wins} win${wins === 1 ? "" : "s"} and no tagged mistakes. Discipline held under pressure.`;
  } else if (revengeIdx != null) {
    paragraph = `Revenge pattern detected: a trade was entered shortly after a loss within the session. Across ${session.length} trade${session.length === 1 ? "" : "s"}, ${mistakeCount} carried tagged mistakes.`;
  } else if (noSL > 0) {
    paragraph = `${noSL} of ${session.length} trade${session.length === 1 ? "" : "s"} were taken without a stop loss. Risk control is the weakest link in this session.`;
  } else {
    paragraph = `${session.length} trade${session.length === 1 ? "" : "s"} in the last session — ${wins}W / ${losses}L with ${mistakeCount} tagged mistake${mistakeCount === 1 ? "" : "s"}.`;
  }

  const rows: Row[] = session.slice(0, 3).map((t, i) => {
    const idx = i + 1;
    const issues: string[] = [];
    if (!t.stop_loss) issues.push("No stop loss");
    if (t.mistakes && t.mistakes.length > 0) issues.push(t.mistakes[0]);
    if (revengeIdx === i) issues.push("entered shortly after a loss — revenge pattern");
    const ok = issues.length === 0 && (t.followed_plan ?? true);
    const text = ok
      ? `Trade #${idx} — ${t.pair} ${t.direction?.toUpperCase()} · followed plan`
      : `Trade #${idx} — ${t.pair} ${t.direction?.toUpperCase()} · ${issues.join(", ")}`;
    return { id: t.id, ok, text };
  });

  return { paragraph, rows };
}

export function AICoachLastSession({ trades }: { trades: Trade[] }) {
  const { paragraph, rows } = useMemo(() => buildSummary(trades), [trades]);

  return (
    <div className="surface-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          AI Coach — Last Session
        </span>
      </div>
      <p className="text-sm text-soft leading-relaxed">{paragraph}</p>
      {rows.length > 0 && (
        <div className="flex flex-col divide-y divide-border/60">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  r.ok ? "bg-pos" : "bg-neg",
                )}
              />
              <div className="text-sm text-foreground">{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}