import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_weekly_reviews",
  title: "List weekly reviews",
  description: "List the signed-in trader's weekly reviews, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(52).default(8).describe("Max reviews to return (1-52)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("weekly_reviews")
      .select(
        "id,week_start,biggest_mistake,did_well,broken_rule,do_differently,discipline_rating,created_at",
      )
      .order("week_start", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { reviews: data ?? [] },
    };
  },
});