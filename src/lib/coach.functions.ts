import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { VESPER_SYSTEM_PROMPT } from "@/lib/coach-context";
import { performTradeReview } from "@/lib/trade-review.functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const REVIEW_INTENT = /\b(review|analy[sz]e|check|look at|critique)\b[\s\S]*\btrade\b/i;

/** If the trader asks the coach to review a trade, run the screenshot review and return context for the reply. */
async function tradeReviewContext(sb: SupabaseClient<Database>, userId: string, text: string): Promise<string | null> {
  if (!REVIEW_INTENT.test(text)) return null;
  const upper = text.toUpperCase().replace(/[\/\s-]/g, " ");
  const pair = upper.match(/\b(XAU ?USD|XAG ?USD|GOLD|[A-Z]{3} ?(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)|BTC ?USD|ETH ?USD|US30|NAS100|SPX500)\b/)?.[0]?.replace(/ /g, "");
  let q = sb.from("trades").select("id,pair,direction,trade_date,result,pnl").eq("user_id", userId).order("trade_date", { ascending: false }).limit(1);
  if (pair) q = q.ilike("pair", `%${pair === "GOLD" ? "XAUUSD" : pair}%`);
  const { data: trade } = await q.maybeSingle();
  if (!trade) return `TRADE REVIEW REQUEST: No ${pair ? pair + " " : ""}trade was found in the journal. Tell the trader plainly.`;
  const label = `${trade.pair} ${trade.direction} on ${new Date(trade.trade_date).toISOString().slice(0, 10)} (result: ${trade.result ?? "open"}, P&L ${trade.pnl ?? "n/a"})`;
  const r = await performTradeReview(sb, userId, trade.id, true);
  if (!r.hasScreenshots) return `TRADE REVIEW REQUEST for ${label}: this trade has no screenshots, so no chart review is possible. Review it from the logged fields in your context and suggest adding screenshots in Trade History.`;
  if (!r.review) return `TRADE REVIEW REQUEST for ${label}: the chart review could not run (${r.error ?? "unknown reason"}). Tell the trader this plainly; do not invent a review.`;
  return `TRADE REVIEW RESULT for ${label}${r.error ? " (cached: " + r.error + ")" : ""}. Present this to the trader in your own coaching voice. Process only — no buy/sell signals or predictions.
Summary: ${r.review.summary}
Consistent: ${r.review.consistent.join(" | ")}
Conflicts/missing: ${r.review.conflicts.join(" | ")}
Suggestion: ${r.review.suggestion}
Mention the full review is also saved on this trade in Trade History.`;
}

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  context: z.string().min(1).max(20000),
  messages: z.array(MessageSchema).min(1).max(40),
  mode: z.enum(["chat", "insight"]).default("chat"),
  extraSystem: z.string().max(4000).optional(),
});

export const askVesper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { reply: "", error: "AI is not configured. LOVABLE_API_KEY missing." };
    }

    const systemPrompt =
      data.mode === "insight"
        ? `${VESPER_SYSTEM_PROMPT}\n\nTASK: Produce ONE short, specific coaching insight (2-3 sentences) based on the trader's data below. Reference real numbers/pairs/mistakes. No greeting, no preamble, just the insight.`
        : VESPER_SYSTEM_PROMPT;

    const lastUser = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    let reviewCtx: string | null = null;
    if (data.mode === "chat") {
      try { reviewCtx = await tradeReviewContext(context.supabase, context.userId, lastUser); }
      catch (e) { console.error("coach trade review", e); }
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "system", content: data.context },
            ...(data.extraSystem ? [{ role: "system", content: data.extraSystem }] : []),
            ...(reviewCtx ? [{ role: "system", content: reviewCtx }] : []),
            ...data.messages,
          ],
        }),
      });

      if (res.status === 429) {
        return { reply: "", error: "Rate limit reached. Try again in a moment." };
      }
      if (res.status === 402) {
        return { reply: "", error: "AI credits exhausted. Add credits in workspace settings." };
      }
      if (!res.ok) {
        const txt = await res.text();
        console.error("Vesper AI error:", res.status, txt);
        return { reply: "", error: `AI gateway error (${res.status}).` };
      }

      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content?.trim() ?? "";
      return { reply, error: null as string | null };
    } catch (e) {
      console.error("askVesper error:", e);
      return { reply: "", error: "Network error reaching AI." };
    }
  });