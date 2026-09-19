import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type EventStatus = "scheduled" | "released" | "revised";

export type StoredEvent = {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";
  previous: string;
  previousOriginal: string | null;
  previousRevised: boolean;
  forecast: string;
  actual: string;
  status: EventStatus;
  releasedAt: string | null;
  source: string;
  updatedAt: string;
};

export type FeedItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  updatedAt: string | null;
  category: "macro" | "forex" | "crypto";
};

export type NeutralReading = {
  fact: string;
  interpretation: string;
  context: string;
  implication: string;
  uncertainty: string;
  assets: string[];
};

/* -------------------------------------------------------------------------- */
/*  Small parsing helpers                                                     */
/* -------------------------------------------------------------------------- */

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

function parseRss(xml: string, category: FeedItem["category"], fallbackSource: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0] ?? "";
    const title = pickTag(block, "title");
    if (!title) continue;
    const link = pickTag(block, "link");
    const pub = pickTag(block, "pubDate") || pickTag(block, "dc:date");
    const upd = pickTag(block, "atom:updated") || pickTag(block, "lastBuildDate");
    const source = pickTag(block, "source") || fallbackSource;
    const published = pub ? new Date(pub) : null;
    const updated = upd ? new Date(upd) : null;
    items.push({
      id: link || title,
      title,
      source,
      link,
      publishedAt:
        published && !isNaN(published.getTime())
          ? published.toISOString()
          : new Date().toISOString(),
      updatedAt:
        updated && !isNaN(updated.getTime()) && published && updated > published
          ? updated.toISOString()
          : null,
      category,
    });
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/*  News: primary provider -> fallback provider -> last cached copy           */
/* -------------------------------------------------------------------------- */

type Category = "macro" | "forex" | "crypto";

const PROVIDERS: Record<Category, { name: string; url: string }[]> = {
  macro: [
    { name: "CNBC Economy", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258" },
    {
      name: "Google News",
      url: "https://news.google.com/rss/search?q=federal+reserve+OR+inflation+OR+central+bank+OR+economy&hl=en-US&gl=US&ceid=US:en",
    },
  ],
  forex: [
    { name: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
    {
      name: "Google News",
      url: "https://news.google.com/rss/search?q=forex+OR+EURUSD+OR+gold+price+OR+XAUUSD+OR+dollar+index&hl=en-US&gl=US&ceid=US:en",
    },
  ],
  crypto: [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
    {
      name: "Google News",
      url: "https://news.google.com/rss/search?q=bitcoin+OR+ethereum+OR+crypto+market&hl=en-US&gl=US&ceid=US:en",
    },
  ],
};

type CacheEntry = { items: FeedItem[]; syncedAt: string; provider: string };
const newsCache = new Map<Category, CacheEntry>();

function dedupe(items: FeedItem[]): FeedItem[] {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const overlap = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / Math.min(a.size, b.size);
  };
  const seen: { key: string; tokens: Set<string> }[] = [];
  const out: FeedItem[] = [];
  for (const it of items) {
    const key = it.title.trim().toLowerCase();
    const toks = tokenize(it.title);
    if (seen.some((s) => s.key === key || overlap(s.tokens, toks) >= 0.8)) continue;
    seen.push({ key, tokens: toks });
    out.push(it);
  }
  return out;
}

export const getNewsFeed = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ category: z.enum(["macro", "forex", "crypto"]).default("macro") })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const cat = data.category as Category;
    for (const provider of PROVIDERS[cat]) {
      try {
        const res = await fetch(provider.url, {
          headers: { "User-Agent": "Mozilla/5.0 VesperJournal" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const xml = await res.text();
        const items = dedupe(parseRss(xml, cat, provider.name)).slice(0, 24);
        if (!items.length) continue;
        const entry: CacheEntry = {
          items,
          syncedAt: new Date().toISOString(),
          provider: provider.name,
        };
        newsCache.set(cat, entry);
        return { ...entry, stale: false, error: null as string | null };
      } catch {
        /* try next provider */
      }
    }
    const cached = newsCache.get(cat);
    if (cached) return { ...cached, stale: true, error: null as string | null };
    return {
      items: [] as FeedItem[],
      syncedAt: new Date().toISOString(),
      provider: "none",
      stale: true,
      error: null as string | null,
    };
  });

/* -------------------------------------------------------------------------- */
/*  Economic calendar: server-side sync into the database                     */
/* -------------------------------------------------------------------------- */

const FF_FEEDS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];

function mapImpact(raw: string): StoredEvent["impact"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("holiday")) return "HOLIDAY";
  if (s === "high" || s.includes("red")) return "HIGH";
  if (s === "medium" || s.includes("orange") || s.includes("yellow")) return "MEDIUM";
  return "LOW";
}

function eventKey(country: string, title: string, date: string) {
  const d = new Date(date);
  const iso = isNaN(d.getTime()) ? String(date) : d.toISOString();
  return `${country}|${title}|${iso}`.slice(0, 300);
}

/** Pulls the source feeds and writes normalized rows. Safe to call often. */
export async function syncCalendarNow(): Promise<{ changed: number; error: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const raws: any[] = [];
    for (const url of FF_FEEDS) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 VesperJournal" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) raws.push(...json);
      } catch {
        /* one feed failing is tolerable */
      }
    }
    if (!raws.length) {
      await supabaseAdmin
        .from("calendar_sync_state")
        .upsert({ id: 1, last_checked_at: new Date().toISOString(), last_status: "source_unavailable" });
      return { changed: 0, error: "source_unavailable" };
    }

    const keys = raws.map((e) => eventKey(e.country, e.title, e.date));
    const { data: existing } = await supabaseAdmin
      .from("calendar_events")
      .select("event_key, previous, previous_original, actual, status, previous_revised")
      .in("event_key", keys.slice(0, 1000));
    const byKey = new Map((existing ?? []).map((r) => [r.event_key, r]));

    const nowIso = new Date().toISOString();
    let changed = 0;
    const rows = raws.map((e) => {
      const key = eventKey(e.country, e.title, e.date);
      const prevRow = byKey.get(key);
      const actual = e.actual || "";
      const previous = e.previous || "";
      const previousOriginal = prevRow?.previous_original ?? prevRow?.previous ?? previous;
      const revised =
        !!previousOriginal && !!previous && previousOriginal !== previous
          ? true
          : (prevRow?.previous_revised ?? false);
      const wasReleased = !!prevRow?.actual;
      const status: EventStatus = actual
        ? wasReleased && prevRow?.actual !== actual
          ? "revised"
          : "released"
        : "scheduled";
      if (!prevRow || prevRow.actual !== actual || prevRow.previous !== previous) changed++;
      return {
        event_key: key,
        title: e.title,
        country: e.country,
        event_date: new Date(e.date).toISOString(),
        impact: mapImpact(e.impact),
        forecast: e.forecast || "",
        previous,
        previous_original: previousOriginal,
        previous_revised: revised,
        actual,
        status,
        source: "forexfactory",
        released_at: actual ? (wasReleased ? undefined : nowIso) : null,
        last_seen_at: nowIso,
        updated_at: nowIso,
      };
    });

    for (let i = 0; i < rows.length; i += 250) {
      const chunk = rows.slice(i, i + 250).map((r) => {
        const { released_at, ...rest } = r;
        return released_at === undefined ? rest : r;
      });
      const { error } = await supabaseAdmin
        .from("calendar_events")
        .upsert(chunk as any, { onConflict: "event_key" });
      if (error) console.error("calendar upsert", error);
    }

    await supabaseAdmin.from("calendar_sync_state").upsert({
      id: 1,
      last_checked_at: nowIso,
      ...(changed ? { last_changed_at: nowIso } : {}),
      last_status: "ok",
      updated_at: nowIso,
    });

    return { changed, error: null };
  } catch (e) {
    console.error("syncCalendarNow", e);
    return { changed: 0, error: "sync_failed" };
  }
}

function rowToEvent(r: any): StoredEvent {
  return {
    id: r.event_key,
    title: r.title,
    country: r.country,
    date: r.event_date,
    impact: (r.impact ?? "LOW") as StoredEvent["impact"],
    previous: r.previous ?? "",
    previousOriginal: r.previous_original ?? null,
    previousRevised: !!r.previous_revised,
    forecast: r.forecast ?? "",
    actual: r.actual ?? "",
    status: (r.status ?? "scheduled") as EventStatus,
    releasedAt: r.released_at ?? null,
    source: r.source ?? "forexfactory",
    updatedAt: r.updated_at ?? r.last_seen_at ?? new Date().toISOString(),
  };
}

/**
 * Reads the normalized store. Triggers a background-style sync only when the
 * stored data is older than the freshness budget (tighter around releases).
 */
export const getCalendar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ range: z.enum(["today", "tomorrow", "week"]).default("today") }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let from = new Date(start);
    let to = new Date(start);
    if (data.range === "today") to.setDate(to.getDate() + 1);
    else if (data.range === "tomorrow") {
      from.setDate(from.getDate() + 1);
      to.setDate(to.getDate() + 2);
    } else to.setDate(to.getDate() + 7);

    const read = async () => {
      const { data: rows } = await supabaseAdmin
        .from("calendar_events")
        .select("*")
        .gte("event_date", from.toISOString())
        .lt("event_date", to.toISOString())
        .order("event_date", { ascending: true });
      return (rows ?? []).map(rowToEvent);
    };

    const { data: state } = await supabaseAdmin
      .from("calendar_sync_state")
      .select("last_checked_at")
      .eq("id", 1)
      .maybeSingle();

    let events = await read();
    const nearRelease = events.some((e) => {
      const diff = Math.abs(new Date(e.date).getTime() - now.getTime());
      return diff < 20 * 60_000 && e.impact !== "LOW";
    });
    const budget = nearRelease ? 30_000 : 5 * 60_000;
    const age = state?.last_checked_at
      ? now.getTime() - new Date(state.last_checked_at).getTime()
      : Infinity;

    let syncedAt = state?.last_checked_at ?? null;
    if (age > budget || events.length === 0) {
      const r = await syncCalendarNow();
      if (!r.error) {
        syncedAt = new Date().toISOString();
        events = await read();
      }
    }

    return { events, syncedAt, error: null as string | null };
  });

/* -------------------------------------------------------------------------- */
/*  Macro snapshot — derived from the stored calendar history                 */
/* -------------------------------------------------------------------------- */

export type MacroIndicator = {
  key: string;
  label: string;
  country: string;
  latestActual: string;
  latestPrevious: string;
  latestForecast: string;
  latestDate: string | null;
  nextDate: string | null;
  history: number[];
};

export type MacroGroup = { group: string; indicators: MacroIndicator[] };

const MACRO_MAP: { group: string; key: string; label: string; match: RegExp; country: string }[] = [
  { group: "Inflation", key: "cpi", label: "CPI", match: /\bcpi\b/i, country: "USD" },
  { group: "Inflation", key: "corecpi", label: "Core CPI", match: /core cpi/i, country: "USD" },
  { group: "Inflation", key: "pce", label: "Core PCE", match: /core pce/i, country: "USD" },
  { group: "Inflation", key: "ppi", label: "PPI", match: /\bppi\b/i, country: "USD" },
  { group: "Employment", key: "nfp", label: "Non-Farm Payrolls", match: /non-farm|nonfarm/i, country: "USD" },
  { group: "Employment", key: "unemp", label: "Unemployment Rate", match: /unemployment rate/i, country: "USD" },
  { group: "Employment", key: "ahe", label: "Average Hourly Earnings", match: /average hourly earnings/i, country: "USD" },
  { group: "Employment", key: "claims", label: "Initial Jobless Claims", match: /jobless claims/i, country: "USD" },
  { group: "Growth", key: "gdp", label: "GDP", match: /\bgdp\b/i, country: "USD" },
  { group: "Growth", key: "retail", label: "Retail Sales", match: /retail sales/i, country: "USD" },
  { group: "Growth", key: "ismman", label: "ISM Manufacturing", match: /ism manufacturing/i, country: "USD" },
  { group: "Growth", key: "ismsvc", label: "ISM Services", match: /ism services/i, country: "USD" },
  { group: "Monetary policy", key: "fomc", label: "Fed Rate Decision", match: /federal funds rate|fomc statement/i, country: "USD" },
  { group: "Monetary policy", key: "ecb", label: "ECB Rate Decision", match: /main refinancing rate|ecb rate/i, country: "EUR" },
  { group: "Monetary policy", key: "boe", label: "BoE Rate Decision", match: /official bank rate/i, country: "GBP" },
];

function toNum(s: string): number | null {
  if (!s) return null;
  const m = String(s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export const getMacroSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("calendar_events")
    .select("title, country, event_date, actual, previous, forecast")
    .gte("event_date", since)
    .order("event_date", { ascending: true });

  const all = rows ?? [];
  const now = Date.now();
  const groups = new Map<string, MacroIndicator[]>();

  for (const def of MACRO_MAP) {
    const matches = all.filter(
      (r) => r.country === def.country && def.match.test(r.title ?? ""),
    );
    const released = matches.filter((r) => (r.actual ?? "") !== "");
    const upcoming = matches.find((r) => new Date(r.event_date).getTime() > now);
    const latest = released[released.length - 1];
    const indicator: MacroIndicator = {
      key: def.key,
      label: def.label,
      country: def.country,
      latestActual: latest?.actual ?? "",
      latestPrevious: latest?.previous ?? "",
      latestForecast: latest?.forecast ?? "",
      latestDate: latest?.event_date ?? null,
      nextDate: upcoming?.event_date ?? null,
      history: released
        .slice(-8)
        .map((r) => toNum(r.actual ?? ""))
        .filter((n): n is number => n != null),
    };
    const list = groups.get(def.group) ?? [];
    list.push(indicator);
    groups.set(def.group, list);
  }

  const result: MacroGroup[] = Array.from(groups.entries()).map(([group, indicators]) => ({
    group,
    indicators,
  }));
  return { groups: result, error: null as string | null };
});

/* -------------------------------------------------------------------------- */
/*  Neutral AI readings (no buy/sell, no bullish/bearish conclusions)         */
/* -------------------------------------------------------------------------- */

const NEUTRAL_RULES =
  "You are a macro research assistant for a trading-behaviour journal. You NEVER give trading signals or directional conclusions. " +
  "Never use the words buy, sell, long, short, bullish or bearish. Never tell the user what to do. " +
  "State verifiable facts, a neutral interpretation, the context a trader should verify, a possible implication stated as a possibility, and the key uncertainty that would invalidate the reading. " +
  "Each field is one or two plain-English sentences.";

const neutralItemSchema = {
  type: "object",
  properties: {
    assets: { type: "array", items: { type: "string" } },
    fact: { type: "string" },
    interpretation: { type: "string" },
    context: { type: "string" },
    implication: { type: "string" },
    uncertainty: { type: "string" },
  },
  required: ["assets", "fact", "interpretation", "context", "implication", "uncertainty"],
  additionalProperties: false,
} as const;

async function callGateway(system: string, user: string, name: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) return { raw: [] as any[], error: "AI is not configured." };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name,
            description: "Return one neutral reading per item, in order.",
            parameters: {
              type: "object",
              properties: { results: { type: "array", items: neutralItemSchema } },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name } },
    }),
  });
  if (res.status === 429) return { raw: [], error: "Analysis is busy — try again shortly." };
  if (res.status === 402) return { raw: [], error: "AI credits exhausted." };
  if (!res.ok) {
    console.error("gateway", res.status, await res.text());
    return { raw: [], error: "Analysis unavailable right now." };
  }
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { raw: [], error: "No analysis returned." };
  try {
    return { raw: (JSON.parse(args).results ?? []) as any[], error: null as string | null };
  } catch {
    return { raw: [] as any[], error: "Could not read analysis." };
  }
}

function toReading(r: any): NeutralReading {
  return {
    assets: Array.isArray(r?.assets) ? r.assets.slice(0, 6).map(String) : [],
    fact: String(r?.fact ?? ""),
    interpretation: String(r?.interpretation ?? ""),
    context: String(r?.context ?? ""),
    implication: String(r?.implication ?? ""),
    uncertainty: String(r?.uncertainty ?? ""),
  };
}

export const explainHeadlines = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ headlines: z.array(z.string().min(1).max(400)).min(1).max(10) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { raw, error } = await callGateway(
      NEUTRAL_RULES,
      "Provide a neutral reading for each headline, in order:\n" +
        data.headlines.map((h, i) => `${i + 1}. ${h}`).join("\n"),
      "report_readings",
    );
    return { results: raw.map(toReading), error };
  });

/* Calendar readings, cached per event in calendar_event_analysis.
   Legacy rows that still contain directional language are regenerated. */

const directional = /\b(bull|bear|buy|sell|long|short)\b/i;

const CalInput = z.object({
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(300),
        title: z.string().default(""),
        country: z.string().default(""),
        date: z.string().default(""),
        impact: z.string().default("LOW"),
        forecast: z.string().default(""),
        previous: z.string().default(""),
        actual: z.string().default(""),
      }),
    )
    .min(1)
    .max(24),
});

export type CalendarReading = NeutralReading & { id: string; actual: string };

function rowToReading(r: any): CalendarReading {
  return {
    id: r.event_key,
    actual: r.actual ?? "",
    fact: r.above ?? "",
    interpretation: r.short_term ?? "",
    context: r.on_forecast ?? "",
    implication: r.long_term ?? "",
    uncertainty: r.below ?? "",
    assets: [],
  };
}

export const getCachedCalendarReadings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ ids: z.array(z.string()).min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows } = await supabaseAdmin
        .from("calendar_event_analysis")
        .select("event_key, actual, short_term, long_term, above, on_forecast, below")
        .in("event_key", data.ids);
      const usable = (rows ?? []).filter(
        (r) =>
          !!r.short_term &&
          !directional.test(`${r.above ?? ""} ${r.on_forecast ?? ""} ${r.below ?? ""}`),
      );
      return { results: usable.map(rowToReading), error: null as string | null };
    } catch {
      return { results: [] as CalendarReading[], error: null as string | null };
    }
  });

export const ensureCalendarReadings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CalInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ids = data.events.map((e) => e.id);
      const { data: rows } = await supabaseAdmin
        .from("calendar_event_analysis")
        .select("event_key, actual, short_term, long_term, above, on_forecast, below")
        .in("event_key", ids);
      const byKey = new Map((rows ?? []).map((r) => [r.event_key, r]));

      const cached: CalendarReading[] = [];
      const todoAll: typeof data.events = [];
      for (const ev of data.events) {
        const row = byKey.get(ev.id);
        const fresh =
          row &&
          !!row.short_term &&
          (row.actual ?? "") === (ev.actual ?? "") &&
          !directional.test(`${row.above ?? ""} ${row.on_forecast ?? ""} ${row.below ?? ""}`);
        if (fresh && row) cached.push(rowToReading(row));
        else todoAll.push(ev);
      }

      const todo = todoAll.slice(0, 6);
      if (!todo.length) {
        return { results: cached, pending: [] as string[], error: null as string | null };
      }

      const { raw } = await callGateway(
        NEUTRAL_RULES +
          " For an event with no actual yet, describe what the release measures and what to watch, not what price will do.",
        "Provide a neutral reading for each economic release, in order:\n" +
          todo
            .map(
              (e, i) =>
                `${i + 1}. [${e.country}] ${e.title} — impact ${e.impact}, forecast ${e.forecast || "n/a"}, previous ${e.previous || "n/a"}, actual ${e.actual || "not released"}`,
            )
            .join("\n"),
        "report_readings",
      );

      const generated: CalendarReading[] = [];
      const upserts = todo.map((e, i) => {
        const r = toReading(raw[i] ?? {});
        if (r.interpretation) {
          generated.push({ ...r, id: e.id, actual: e.actual ?? "" });
        }
        return {
          event_key: e.id,
          title: e.title,
          country: e.country,
          event_date: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
          impact: e.impact,
          forecast: e.forecast ?? "",
          previous: e.previous ?? "",
          actual: e.actual ?? "",
          short_term: r.interpretation,
          long_term: r.implication,
          above: r.fact,
          on_forecast: r.context,
          below: r.uncertainty,
        };
      });

      const persist = upserts.filter((u) => u.short_term);
      if (persist.length) {
        await supabaseAdmin
          .from("calendar_event_analysis")
          .upsert(persist, { onConflict: "event_key" });
      }

      const done = new Set(generated.map((g) => g.id));
      return {
        results: [...cached, ...generated],
        pending: todoAll.filter((e) => !done.has(e.id)).map((e) => e.id),
        error: null as string | null,
      };
    } catch (e) {
      console.error("ensureCalendarReadings", e);
      return {
        results: [] as CalendarReading[],
        pending: data.events.map((e) => e.id),
        error: null as string | null,
      };
    }
  });

/* -------------------------------------------------------------------------- */
/*  Thesis critique — questions the trader's own thesis, never directs it     */
/* -------------------------------------------------------------------------- */

export const critiqueThesis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ thesis: z.string().min(10).max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) return { critique: "", error: "AI is not configured." };
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
            {
              role: "system",
              content:
                NEUTRAL_RULES +
                " The user writes their own market thesis. Do not agree, disagree or give a direction. " +
                "Reply with: MISSING EVIDENCE (what data they have not cited), ASSUMPTIONS (what they are taking for granted), " +
                "and WHAT WOULD INVALIDATE THIS. Short bullet lines, no preamble.",
            },
            { role: "user", content: data.thesis },
          ],
        }),
      });
      if (!res.ok) return { critique: "", error: "Review unavailable right now." };
      const json = await res.json();
      return {
        critique: String(json?.choices?.[0]?.message?.content ?? ""),
        error: null as string | null,
      };
    } catch {
      return { critique: "", error: "Review unavailable right now." };
    }
  });
