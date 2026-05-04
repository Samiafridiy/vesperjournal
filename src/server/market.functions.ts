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

/* -------------------------------------------------------------------------- */
/*  Economic calendar (ForexFactory free JSON feed — no API key)              */
/* -------------------------------------------------------------------------- */

function mapImpact(raw: string): CalendarEvent["impact"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("holiday")) return "HOLIDAY";
  if (s === "high" || s.includes("red")) return "HIGH";
  if (s === "medium" || s.includes("orange") || s.includes("yellow")) return "MEDIUM";
  return "LOW";
}

const FF_FEEDS = {
  thisweek: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  nextweek: "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
};

export const getEconomicCalendar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        range: z.enum(["today", "tomorrow", "week"]).default("today"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(FF_FEEDS.thisweek, {
        headers: { "User-Agent": "Mozilla/5.0 VesperJournal" },
      });
      if (!res.ok) {
        return { events: [] as CalendarEvent[], error: `Calendar feed error (${res.status})` };
      }
      const json = (await res.json()) as Array<{
        title: string;
        country: string;
        date: string;
        impact: string;
        forecast: string;
        previous: string;
        actual?: string;
      }>;

      const all: CalendarEvent[] = json.map((e, i) => ({
        id: `${e.country}-${e.title}-${e.date}-${i}`,
        title: e.title,
        country: e.country,
        date: new Date(e.date).toISOString(),
        impact: mapImpact(e.impact),
        forecast: e.forecast || "",
        previous: e.previous || "",
        actual: e.actual || "",
      }));

      const now = new Date();
      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };
      const today = startOfDay(now);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      let filtered = all;
      if (data.range === "today") {
        filtered = all.filter((e) => {
          const d = new Date(e.date);
          return d >= today && d < tomorrow;
        });
      } else if (data.range === "tomorrow") {
        filtered = all.filter((e) => {
          const d = new Date(e.date);
          return d >= tomorrow && d < dayAfter;
        });
      } else {
        filtered = all.filter((e) => {
          const d = new Date(e.date);
          return d >= today && d < weekEnd;
        });
      }

      return { events: filtered, error: null as string | null };
    } catch (e) {
      console.error("getEconomicCalendar error", e);
      return { events: [] as CalendarEvent[], error: "Failed to fetch calendar" };
    }
  });

/* -------------------------------------------------------------------------- */
/*  AI calendar analysis (Lovable AI Gateway, structured tool-calling)        */
/* -------------------------------------------------------------------------- */

const CalendarAnalyzeInput = z.object({
  events: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        country: z.string(),
        impact: z.string(),
        forecast: z.string().optional().default(""),
        previous: z.string().optional().default(""),
      }),
    )
    .min(1)
    .max(15),
});

export const analyzeCalendar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CalendarAnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return {
        results: [] as Array<CalendarAnalysis & { id: string }>,
        error: "AI is not configured.",
      };
    }

    const systemPrompt =
      "You are a professional forex market analyst. For each economic event, provide: 1) Short term price impact in next 1-4 hours if result beats forecast, meets forecast, or misses forecast — be specific about pip moves and direction. 2) Longer term impact over next 1-7 days on related currency pairs and assets. Also state the directional outcome for the affected currency under three scenarios: above forecast, on forecast, below forecast (each one short phrase like 'Very Bullish USD', 'Neutral', 'Bearish USD'). Keep each answer to 2 sentences maximum. Be direct and specific with pair names.";

    const userPrompt =
      "Analyze these economic events:\n" +
      data.events
        .map(
          (e, i) =>
            `${i + 1}. [${e.country}] ${e.title} — impact ${e.impact}, forecast ${e.forecast || "n/a"}, previous ${e.previous || "n/a"}`,
        )
        .join("\n");

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
                name: "report_calendar",
                description: "Return structured analysis for each economic event.",
                parameters: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          shortTerm: { type: "string" },
                          longTerm: { type: "string" },
                          above: { type: "string" },
                          on: { type: "string" },
                          below: { type: "string" },
                        },
                        required: ["shortTerm", "longTerm", "above", "on", "below"],
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
          tool_choice: { type: "function", function: { name: "report_calendar" } },
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
        console.error("analyzeCalendar error", res.status, txt);
        return { results: [], error: `AI gateway error (${res.status})` };
      }

      const json = await res.json();
      const args =
        json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { results: [], error: "No analysis returned." };
      const parsed = JSON.parse(args);
      const raw: any[] = parsed.results ?? [];
      const results = data.events.map((e, i) => {
        const r = raw[i] ?? {};
        return {
          id: e.id,
          shortTerm: String(r.shortTerm ?? ""),
          longTerm: String(r.longTerm ?? ""),
          above: String(r.above ?? ""),
          on: String(r.on ?? ""),
          below: String(r.below ?? ""),
        };
      });
      return { results, error: null as string | null };
    } catch (e) {
      console.error("analyzeCalendar error", e);
      return { results: [], error: "Network error reaching AI." };
    }
  });