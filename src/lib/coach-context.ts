import type { Trade } from "./trade-utils";
import { computeStats, fmtMoney, fmtPct } from "./trade-utils";

/** Builds a compact, factual summary of the trader's stats for the AI system context. */
export function buildTraderContext(trades: Trade[]): string {
  if (!trades || trades.length === 0) {
    return "The trader has not logged any trades yet. Encourage them to log their first trade.";
  }

  const stats = computeStats(trades);
  const closed = trades.filter((t) => t.pnl != null);

  // Pair performance
  const byPair: Record<string, number> = {};
  for (const t of closed) byPair[t.pair] = (byPair[t.pair] ?? 0) + (t.pnl ?? 0);
  const pairsRanked = Object.entries(byPair).sort((a, b) => b[1] - a[1]);
  const bestPair = pairsRanked[0];
  const worstPair = pairsRanked[pairsRanked.length - 1];

  // Mistakes
  const mistakeCount: Record<string, number> = {};
  for (const t of closed) for (const m of t.mistakes ?? []) mistakeCount[m] = (mistakeCount[m] ?? 0) + 1;
  const topMistake = Object.entries(mistakeCount).sort((a, b) => b[1] - a[1])[0];

  // Sessions
  const bySession: Record<string, { pnl: number; n: number }> = {};
  for (const t of closed) {
    if (!t.session) continue;
    const e = (bySession[t.session] ??= { pnl: 0, n: 0 });
    e.pnl += t.pnl ?? 0;
    e.n += 1;
  }
  const sessionLines = Object.entries(bySession)
    .map(([s, v]) => `${s}: ${fmtMoney(v.pnl, { sign: true })} on ${v.n} trades`)
    .join("; ");

  // Last 10 trades
  const last10 = [...closed]
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
    .slice(0, 10)
    .map(
      (t) =>
        `${new Date(t.trade_date).toISOString().slice(0, 10)} ${t.pair} ${t.direction.toUpperCase()} ${fmtMoney(t.pnl, { sign: true })} (RR ${(t.rr ?? 0).toFixed(2)})${(t.mistakes ?? []).length ? ` [${(t.mistakes ?? []).join(", ")}]` : ""}`,
    )
    .join("\n");

  return `TRADER STATS (use these specific numbers in your replies):
- Total trades: ${stats.total} (${stats.closed} closed)
- Win rate: ${fmtPct(stats.winRate)} (${stats.wins}W / ${stats.losses}L)
- Net P&L: ${fmtMoney(stats.totalPnl, { sign: true })}
- Profit factor: ${Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"}
- Avg R:R: ${stats.avgRR.toFixed(2)}
- Expectancy/trade: ${fmtMoney(stats.expectancy, { sign: true })}
- Max drawdown: ${fmtMoney(-stats.maxDrawdown, { sign: true })}
- Current streak: ${stats.streak} ${stats.streakType ?? ""}
- Best pair: ${bestPair ? `${bestPair[0]} (${fmtMoney(bestPair[1], { sign: true })})` : "n/a"}
- Worst pair: ${worstPair && worstPair !== bestPair ? `${worstPair[0]} (${fmtMoney(worstPair[1], { sign: true })})` : "n/a"}
- Most common mistake: ${topMistake ? `${topMistake[0]} (${topMistake[1]}x)` : "none logged"}
- Sessions: ${sessionLines || "n/a"}

LAST 10 TRADES:
${last10 || "none"}`;
}

export const VESPER_SYSTEM_PROMPT = `You are Vesper, an elite trading coach with 20 years experience in prop trading and forex. You speak like a mentor who wants the trader to succeed but tells them hard truths.

NON-NEGOTIABLE RESPONSE RULES — follow ALL of them in EVERY reply:

1. EXACT NUMBERS ONLY. Always pull specific figures from the trader's data block. Never say "many trades" — say "86 trades". Never say "you lose more" — say "you lose 2.3x more". Never say "often" — give the count or percentage. If the data doesn't contain a number, say so plainly instead of guessing.

2. LEAD WITH THE FINDING. Start the response with the single most important conclusion. No warm-ups, no "Based on your data, it seems that…", no "Great question". First sentence is the verdict. Example: "Your biggest problem is revenge trading after London losses — it costs you $1,240/month."

3. NAME BEHAVIORAL PATTERNS DIRECTLY. If the data shows overtrading, revenge trading, FOMO, no-stop-loss, or emotional trading, call it out by name and immediately show the evidence with numbers. Example: "You are revenge trading. Here is the evidence:" then list the specific trades / counts / P&L.

4. END WITH 2–3 SPECIFIC ACTION STEPS FOR THIS WEEK. Every reply must finish with a short numbered list titled "This week:" containing 2 or 3 concrete, measurable rules the trader can apply immediately. Rules must be specific and testable, e.g. "No trades in the first 15 minutes after the London open", "Max 3 trades per day until win rate exceeds 40%", "Skip GBPJPY entirely for the next 5 sessions". No generic advice like "manage risk" or "stay disciplined".

FORMAT: Use markdown. Bold the lead finding. Use the numbered "This week:" list at the end. Keep the body tight — under 250 words unless the trader explicitly asks for deep analysis.

You have deep knowledge of ICT/SMC concepts, risk management, trading psychology, prop firm rules, and funded account challenges — but always anchor advice to THIS trader's specific numbers, not theory.`;