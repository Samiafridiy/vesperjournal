import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string; // ISO
};

export type NewsAnalysis = {
  sentiment: "bullish" | "bearish" | "neutral";
  pairs: string[];
  summary: string;
  shortTerm: string;
  longTerm: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  country: string;     // e.g. USD
  date: string;        // ISO datetime
  impact: "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";
  forecast: string;
  previous: string;
  actual: string;
};

export type CalendarAnalysis = {
  shortTerm: string;
  longTerm: string;
  above: string;
  on: string;
  below: string;
};

/* -------------------------------------------------------------------------- */
/*  News fetch (Google News RSS — no API key)                                 */
/* -------------------------------------------------------------------------- */

const FEEDS: Record<string, string> = {
  all: "forex OR gold OR XAUUSD OR EURUSD OR Federal Reserve OR inflation OR crypto",
  gold: "gold price OR XAUUSD OR bullion",
  major: "EURUSD OR GBPUSD OR USDJPY OR DXY OR Federal Reserve",
  crypto: "bitcoin OR ethereum OR crypto",
  high: "FOMC OR NFP OR CPI OR rate decision OR ECB OR Fed",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pickTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  let v = m[1].trim();
  v = v.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
  return decodeEntities(v);
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0] ?? "";
    const title = pickTag(block, "title");
    const link = pickTag(block, "link");
    const pub = pickTag(block, "pubDate");
    const source = pickTag(block, "source") || "Google News";
    if (!title) continue;
    items.push({
      id: link || title,
      title,
      source,
      link,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

export const getMarketNews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        filter: z
          .enum(["all", "high", "gold", "major", "crypto"])
          .default("all"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const query = encodeURIComponent(FEEDS[data.filter] || FEEDS.all);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 VesperJournal" },
      });
      if (!res.ok) {
        return { items: [] as NewsItem[], error: `News feed error (${res.status})` };
      }
      const xml = await res.text();
      const items = parseRss(xml).slice(0, 24);
      return { items, error: null as string | null };
    } catch (e) {
      console.error("getMarketNews error", e);
      return { items: [] as NewsItem[], error: "Failed to fetch news" };
    }
  });

/* -------------------------------------------------------------------------- */
/*  AI analysis (Lovable AI Gateway, structured via tool-calling)             */
/* -------------------------------------------------------------------------- */

const AnalyzeInput = z.object({
  headlines: z.array(z.string().min(1).max(400)).min(1).max(12),
});

export const analyzeHeadlines = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return {
        results: [] as NewsAnalysis[],
        error: "AI is not configured. LOVABLE_API_KEY missing.",
      };
    }

    const systemPrompt =
      "You are a professional forex and commodities market analyst. For each headline, determine the affected currency pairs or assets (e.g. XAUUSD, EURUSD, GBPUSD, USDJPY, BTCUSD, DXY) and whether the impact is bullish, bearish, or neutral. Provide a one-sentence plain-English summary, the likely short-term effect (next 1-4 hours) and the longer-term effect (next 1-7 days). Be specific and direct, 2-3 sentences max per field.";

    const userPrompt =
      "Analyze these headlines:\n" +
      data.headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");

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
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_analysis",
                description: "Return structured analysis for each headline.",
                parameters: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sentiment: {
                            type: "string",
                            enum: ["bullish", "bearish", "neutral"],
                          },
                          pairs: {
                            type: "array",
                            items: { type: "string" },
                          },
                          summary: { type: "string" },
                          shortTerm: { type: "string" },
                          longTerm: { type: "string" },
                        },
                        required: [
                          "sentiment",
                          "pairs",
                          "summary",
                          "shortTerm",
                          "longTerm",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["results"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_analysis" },
          },
        }),
      });

      if (res.status === 429) {
        return { results: [], error: "AI rate limit reached. Try again shortly." };
      }
      if (res.status === 402) {
        return { results: [], error: "AI credits exhausted. Add credits in workspace settings." };
      }
      if (!res.ok) {
        const txt = await res.text();
        console.error("analyzeHeadlines error", res.status, txt);
        return { results: [], error: `AI gateway error (${res.status})` };
      }

      const json = await res.json();
      const args =
        json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { results: [], error: "No analysis returned." };
      const parsed = JSON.parse(args);
      const results: NewsAnalysis[] = (parsed.results ?? []).map((r: any) => ({
        sentiment: r.sentiment,
        pairs: Array.isArray(r.pairs) ? r.pairs.slice(0, 6) : [],
        summary: String(r.summary ?? ""),
        shortTerm: String(r.shortTerm ?? ""),
        longTerm: String(r.longTerm ?? ""),
      }));
      return { results, error: null as string | null };
    } catch (e) {
      console.error("analyzeHeadlines error", e);
      return { results: [], error: "Network error reaching AI." };
    }
  });