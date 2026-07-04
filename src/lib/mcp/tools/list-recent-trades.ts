import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_trades",
  title: "List recent trades",
  description:
    "List the signed-in trader's most recent trades from Vesper Journal, newest first.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Max number of trades to return (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("trades")
      .select(
        "id,trade_date,pair,direction,session,strategy,entry_price,close_price,lot_size,rr,pnl,result,mistakes,notes",
      )
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { trades: data ?? [] },
    };
  },
});