import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_trading_rules",
  title: "List trading rules",
  description: "List the signed-in trader's personal trading rules from their Rule Book.",
  inputSchema: {
    activeOnly: z.boolean().default(true).describe("If true, only return active rules."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ activeOnly }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("trading_rules")
      .select("id,text,active,created_at")
      .order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rules: data ?? [] },
    };
  },
});