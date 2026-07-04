import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_trade_stats",
  title: "Get trade stats",
  description:
    "Aggregate the signed-in trader's performance across a lookback window: trade count, wins, losses, breakevens, win rate, total P&L, and average R.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(30)
      .describe("Lookback window in days (1-365)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("trades")
      .select("pnl,result,rr")
      .gte("trade_date", since);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    const wins = rows.filter((r) => r.result === "win").length;
    const losses = rows.filter((r) => r.result === "loss").length;
    const breakevens = rows.filter((r) => r.result === "breakeven").length;
    const pnl = rows.reduce((s, r) => s + (Number(r.pnl) || 0), 0);
    const rrVals = rows.map((r) => Number(r.rr)).filter((v) => Number.isFinite(v));
    const avgRr = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 0;
    const decided = wins + losses;
    const stats = {
      days,
      trades: rows.length,
      wins,
      losses,
      breakevens,
      winRate: decided ? +((wins / decided) * 100).toFixed(1) : 0,
      totalPnl: +pnl.toFixed(2),
      avgRr: +avgRr.toFixed(2),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: stats,
    };
  },
});