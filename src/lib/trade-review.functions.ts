import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const DAILY_REVIEW_CAP = 10;

export type TradeReview = {
  summary: string;
  consistent: string[];
  conflicts: string[];
  suggestion: string;
};

export type ReviewResponse = {
  review: TradeReview | null;
  createdAt: string | null;
  stale: boolean;
  hasScreenshots: boolean;
  usedToday: number;
  cap: number;
  error: string | null;
};

const Input = z.object({ tradeId: z.string().uuid(), run: z.boolean().default(false) });

const SYSTEM = `You are a trading-journal reviewer. You review the trader's PROCESS, never the market.
You receive up to 4 chart screenshots, each with a timeframe label and the trader's notes, plus the trade's logged fields.
Do:
a) Check whether each screenshot's notes match what is visible in that chart.
b) Check consistency across timeframes (higher-timeframe bias vs lower-timeframe structure vs entry) and point out conflicts.
c) Compare the written reasoning with the tags and result (e.g. notes say "waited for confirmation" but tagged "Early entry").
d) Name what the trader did well, not only mistakes.
Never:
- give buy/sell signals, directional bias, or predict future price movement;
- state exact price levels read from an image unless that level also appears in the notes or trade fields;
- guess. If a chart is unclear, cropped or unreadable, say so plainly.
Keep it short and plain-English. Each list item one sentence. 2-4 items per list.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "consistent", "conflicts", "suggestion"],
  properties: {
    summary: { type: "string" },
    consistent: { type: "array", items: { type: "string" } },
    conflicts: { type: "array", items: { type: "string" } },
    suggestion: { type: "string" },
  },
};

async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const reviewTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<ReviewResponse> => {
    const sb = context.supabase;
    const userId = context.userId;
    const base = { review: null, createdAt: null, stale: false, hasScreenshots: false, usedToday: 0, cap: DAILY_REVIEW_CAP };

    // Ownership is enforced by RLS: another user's trade returns no row.
    const { data: trade } = await sb
      .from("trades")
      .select("id,user_id,pair,direction,entry_price,stop_loss,take_profit,close_price,result,pnl,rr,emotion_before,emotion_after,mistakes,wins_well,followed_plan,notes,strategy,session,screenshot_url")
      .eq("id", data.tradeId)
      .maybeSingle();
    if (!trade || trade.user_id !== userId) return { ...base, error: "Trade not found." };

    const { data: rows } = await sb
      .from("trade_screenshots")
      .select("path,timeframe,notes,position")
      .eq("trade_id", trade.id)
      .order("position");
    let shots = rows ?? [];
    if (!shots.length && trade.screenshot_url) shots = [{ path: trade.screenshot_url, timeframe: "", notes: "", position: 0 }];

    const fields = {
      pair: trade.pair, direction: trade.direction, entry: trade.entry_price, stop_loss: trade.stop_loss,
      take_profit: trade.take_profit, close: trade.close_price, result: trade.result, pnl: trade.pnl, rr: trade.rr,
      session: trade.session, strategy: trade.strategy, emotion_before: trade.emotion_before,
      emotion_after: trade.emotion_after, mistakes: trade.mistakes, went_well: trade.wins_well,
      followed_plan: trade.followed_plan, trade_notes: trade.notes,
    };
    const hash = await sha(JSON.stringify({ fields, shots: shots.map((s) => [s.path, s.timeframe, s.notes]) }));

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [{ data: last }, { count }] = await Promise.all([
      sb.from("trade_ai_reviews").select("review,input_hash,created_at").eq("trade_id", trade.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("trade_ai_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfDay.toISOString()),
    ]);
    const usedToday = count ?? 0;
    const cached = {
      ...base,
      hasScreenshots: shots.length > 0,
      usedToday,
      review: (last?.review as TradeReview | undefined) ?? null,
      createdAt: last?.created_at ?? null,
      stale: !!last && last.input_hash !== hash,
      error: null,
    };
    if (!data.run) return cached;
    if (!shots.length) return { ...cached, error: "Add at least one screenshot to get a review." };
    if (usedToday >= DAILY_REVIEW_CAP) {
      return { ...cached, error: `You've used all ${DAILY_REVIEW_CAP} AI reviews for today. They reset at midnight UTC.` };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ...cached, error: "AI review isn't configured yet." };

    // Short-lived signed URLs — the bucket stays private.
    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: `Trade fields:\n${JSON.stringify(fields, null, 2)}` },
    ];
    for (const [i, s] of shots.entries()) {
      let url = s.path;
      if (!/^https?:\/\//i.test(url)) {
        const { data: su } = await sb.storage.from("screenshots").createSignedUrl(s.path, 300);
        if (!su?.signedUrl) continue;
        url = su.signedUrl;
      }
      content.push({ type: "input_text", text: `Screenshot ${i + 1} — timeframe: ${s.timeframe || "not labeled"}. Trader's notes: ${s.notes || "(none)"}` });
      content.push({ type: "input_image", image_url: url });
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          Authorization: `Bearer ${key}`,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          instructions: SYSTEM,
          text: { format: { type: "json_schema", name: "trade_review", strict: true, schema: SCHEMA } },
          input: [{ role: "user", content }],
        }),
      });
      if (res.status === 429) return { ...cached, error: "The AI is busy right now. Please try again in a minute." };
      if (res.status === 402) return { ...cached, error: "AI credits have run out for this workspace." };
      if (!res.ok || !res.body) {
        console.error("reviewTrade", res.status, await res.text().catch(() => ""));
        return { ...cached, error: "The review couldn't be completed. Please try again later." };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const p = line.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          try {
            const ev = JSON.parse(p);
            if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          } catch { /* ignore */ }
        }
      }
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return { ...cached, error: "The AI didn't return a review. Please try again." };
      const p = JSON.parse(m[0]);
      const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : []);
      const review: TradeReview = {
        summary: String(p.summary ?? ""),
        consistent: strs(p.consistent),
        conflicts: strs(p.conflicts),
        suggestion: String(p.suggestion ?? ""),
      };
      const { data: ins, error: insErr } = await sb
        .from("trade_ai_reviews")
        .insert({ trade_id: trade.id, user_id: userId, input_hash: hash, review })
        .select("created_at")
        .single();
      if (insErr) console.error("reviewTrade insert", insErr);
      return { ...cached, review, createdAt: ins?.created_at ?? new Date().toISOString(), stale: false, usedToday: usedToday + 1, error: null };
    } catch (e) {
      console.error("reviewTrade", e);
      return { ...cached, error: "The review couldn't be completed. Please try again later." };
    }
  });
