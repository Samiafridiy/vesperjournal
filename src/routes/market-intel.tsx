import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CalendarClock,
  BarChart3,
  Layers,
  BookOpen,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import {
  getNewsFeed,
  getCalendar,
  getMacroSnapshot,
  explainHeadlines,
  getCachedCalendarReadings,
  ensureCalendarReadings,
  critiqueThesis,
  type FeedItem,
  type StoredEvent,
  type NeutralReading,
  type CalendarReading,
  type MacroGroup,
} from "@/lib/market-intel.functions";
import { useTrades } from "@/hooks/use-trades";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { classifyHeadlineImpact, type Impact } from "@/lib/economic-calendar";

export const Route = createFileRoute("/market-intel")({
  head: () => ({
    meta: [
      { title: "Market Intel — Vesper Journal" },
      {
        name: "description",
        content:
          "Verified economic releases, macro history and neutral AI explanations — facts and scenarios, never signals.",
      },
      { property: "og:title", content: "Market Intel — Vesper Journal" },
      {
        property: "og:description",
        content:
          "Verified economic releases, macro history and neutral AI explanations — facts and scenarios, never signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <MarketIntelPage />
      </AppShell>
    </RouteGate>
  ),
});

type TabKey = "news" | "calendar" | "macro" | "analysis" | "scenarios" | "thesis";

const TABS: { key: TabKey; label: string; icon: typeof Newspaper }[] = [
  { key: "news", label: "Live News", icon: Newspaper },
  { key: "calendar", label: "Calendar", icon: CalendarClock },
  { key: "macro", label: "Macro", icon: BarChart3 },
  { key: "analysis", label: "Analysis", icon: Brain },
  { key: "scenarios", label: "Scenarios", icon: Layers },
  { key: "thesis", label: "Thesis", icon: BookOpen },
];

const PAIR_ALIASES: Record<string, string> = {
  SPX: "SP500",
  SPX500: "SP500",
  US500: "SP500",
  ES: "SP500",
  NDX: "NASDAQ",
  NAS100: "NASDAQ",
  US100: "NASDAQ",
  USDX: "DXY",
  DXYUSD: "DXY",
  GOLD: "XAUUSD",
  XAU: "XAUUSD",
};

function normalizePair(p: string): string {
  const k = p.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return PAIR_ALIASES[k] ?? k;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function clockOf(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */

function MarketIntelPage() {
  const [tab, setTab] = useState<TabKey>("news");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- News ---- */
  const [category, setCategory] = useState<"macro" | "forex" | "crypto">("macro");
  const [news, setNews] = useState<FeedItem[]>([]);
  const [newsSyncedAt, setNewsSyncedAt] = useState<string | null>(null);
  const [newsProvider, setNewsProvider] = useState<string>("");
  const [newsStale, setNewsStale] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  /* ---- Calendar ---- */
  const [range, setRange] = useState<"today" | "tomorrow" | "week">("today");
  const [impactFilter, setImpactFilter] = useState<"high" | "medium" | "low">("high");
  const [calEvents, setCalEvents] = useState<StoredEvent[]>([]);
  const [calSyncedAt, setCalSyncedAt] = useState<string | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [readings, setReadings] = useState<Record<string, CalendarReading>>({});
  const [calPending, setCalPending] = useState<Record<string, boolean>>({});
  const [calExpanded, setCalExpanded] = useState<Record<string, boolean>>({});

  /* ---- Macro ---- */
  const [macro, setMacro] = useState<MacroGroup[]>([]);
  const [macroLoading, setMacroLoading] = useState(false);

  /* ---- Analysis ---- */
  const [newsReadings, setNewsReadings] = useState<Record<string, NeutralReading>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const fetchNews = useServerFn(getNewsFeed);
  const fetchCalendar = useServerFn(getCalendar);
  const fetchMacro = useServerFn(getMacroSnapshot);
  const explain = useServerFn(explainHeadlines);
  const fetchCachedReadings = useServerFn(getCachedCalendarReadings);
  const ensureReadings = useServerFn(ensureCalendarReadings);
  const { trades } = useTrades();

  const loadNews = useCallback(
    async (cat: "macro" | "forex" | "crypto") => {
      setNewsLoading(true);
      const r = await fetchNews({ data: { category: cat } });
      setNews(r.items ?? []);
      setNewsSyncedAt(r.syncedAt ?? null);
      setNewsProvider(r.provider ?? "");
      setNewsStale(!!r.stale);
      setNewsLoading(false);
    },
    [fetchNews],
  );

  useEffect(() => {
    loadNews(category);
    const t = setInterval(() => loadNews(category), 5 * 60_000);
    return () => clearInterval(t);
  }, [category, loadNews]);

  const loadCalendar = useCallback(
    async (r: "today" | "tomorrow" | "week") => {
      const res = await fetchCalendar({ data: { range: r } });
      setCalEvents(res.events ?? []);
      setCalSyncedAt(res.syncedAt ?? null);
      setCalLoading(false);
    },
    [fetchCalendar],
  );

  useEffect(() => {
    setCalLoading(true);
    loadCalendar(range);
    const t = setInterval(() => loadCalendar(range), 60_000);
    return () => clearInterval(t);
  }, [range, loadCalendar]);

  // Push: the backend sync writes rows, we react instead of polling hard.
  const rangeRef = useRef(range);
  rangeRef.current = range;
  useEffect(() => {
    const channel = supabase
      .channel("market-intel-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => loadCalendar(rangeRef.current),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCalendar]);

  const events = useMemo(() => {
    const allow = new Set<StoredEvent["impact"]>(
      impactFilter === "high"
        ? ["HIGH"]
        : impactFilter === "medium"
          ? ["HIGH", "MEDIUM"]
          : ["HIGH", "MEDIUM", "LOW", "HOLIDAY"],
    );
    const rk = (i: StoredEvent["impact"]) =>
      i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : i === "LOW" ? 2 : 3;
    const nowMs = Date.now();
    return calEvents
      .filter((e) => allow.has(e.impact))
      .sort((a, b) => {
        const aDone = a.status !== "scheduled" || new Date(a.date).getTime() < nowMs - 3600_000;
        const bDone = b.status !== "scheduled" || new Date(b.date).getTime() < nowMs - 3600_000;
        if (aDone !== bDone) return aDone ? 1 : -1;
        const r = rk(a.impact) - rk(b.impact);
        if (r !== 0) return r;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [calEvents, impactFilter]);

  // Neutral readings for the most relevant events (cached first, then generate)
  useEffect(() => {
    const top = events.filter((e) => e.impact !== "HOLIDAY").slice(0, 12);
    if (!top.length) return;
    let cancelled = false;
    (async () => {
      const merge = (list: CalendarReading[]) => {
        if (cancelled || !list.length) return;
        setReadings((prev) => {
          const next = { ...prev };
          for (const r of list) if (r.interpretation) next[r.id] = r;
          return next;
        });
      };
      const cachedIds = new Set<string>();
      try {
        const cached = await fetchCachedReadings({ data: { ids: top.map((e) => e.id) } });
        const usable = (cached.results ?? []).filter((r) => {
          const ev = top.find((e) => e.id === r.id);
          return ev && (ev.actual || "") === (r.actual || "");
        });
        usable.forEach((r) => cachedIds.add(r.id));
        merge(usable);
      } catch {
        /* best effort */
      }
      const missing = top.filter((e) => !cachedIds.has(e.id)).slice(0, 6);
      if (!missing.length || cancelled) return;
      try {
        const gen = await ensureReadings({
          data: {
            events: missing.map((e) => ({
              id: e.id,
              title: e.title,
              country: e.country,
              date: e.date,
              impact: e.impact,
              forecast: e.forecast,
              previous: e.previous,
              actual: e.actual,
            })),
          },
        });
        merge(gen.results ?? []);
        if (!cancelled) {
          setCalPending((p) => {
            const next = { ...p };
            for (const id of gen.pending ?? []) next[id] = true;
            for (const r of gen.results ?? []) delete next[r.id];
            return next;
          });
        }
      } catch {
        /* leave pending */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.map((e) => `${e.id}:${e.actual}`).join("|")]);

  // Macro loads on first visit to its tab
  useEffect(() => {
    if (tab !== "macro" || macro.length || macroLoading) return;
    setMacroLoading(true);
    fetchMacro().then((r) => {
      setMacro(r.groups ?? []);
      setMacroLoading(false);
    });
  }, [tab, macro.length, macroLoading, fetchMacro]);

  // Scenarios always look at the whole week, independent of the calendar range
  const [weekEvents, setWeekEvents] = useState<StoredEvent[]>([]);
  useEffect(() => {
    if (tab !== "scenarios") return;
    let cancelled = false;
    fetchCalendar({ data: { range: "week" } }).then((r) => {
      if (!cancelled) setWeekEvents(r.events ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, fetchCalendar]);



  // Neutral explanations for headlines, on the Analysis tab
  // Explain the most consequential stories first, not just the newest.
  const topHeadlines = useMemo(() => {
    const rank = (i: Impact) => (i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : 2);
    return [...news]
      .sort((a, b) => {
        const r = rank(classifyHeadlineImpact(a.title)) - rank(classifyHeadlineImpact(b.title));
        if (r !== 0) return r;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 6);
  }, [news]);

  useEffect(() => {
    if (tab !== "analysis" || !topHeadlines.length) return;
    const todo = topHeadlines.filter((h) => !newsReadings[h.id]);
    if (!todo.length) return;
    let cancelled = false;
    setAnalyzing(true);
    explain({ data: { headlines: todo.map((h) => h.title) } })
      .then((r) => {
        if (cancelled) return;
        setNewsReadings((prev) => {
          const next = { ...prev };
          (r.results ?? []).forEach((reading, i) => {
            const item = todo[i];
            if (item && reading.interpretation) next[item.id] = reading;
          });
          return next;
        });
      })
      .finally(() => !cancelled && setAnalyzing(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, topHeadlines.map((h) => h.id).join("|")]);

  const sortedNews = useMemo(() => {
    const rank = (i: Impact) => (i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : 2);
    return news
      .map((n) => ({ ...n, impact: classifyHeadlineImpact(n.title) }))
      .sort((a, b) => {
        const r = rank(a.impact) - rank(b.impact);
        if (r !== 0) return r;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [news]);

  // "What this touches in your journal" — factual exposure, no direction
  const exposure = useMemo(() => {
    const since = Date.now() - 7 * 86_400_000;
    const recent = new Set(
      (trades ?? [])
        .filter((t) => t.trade_date && new Date(t.trade_date).getTime() >= since)
        .map((t) => normalizePair(t.pair || "")),
    );
    if (!recent.size) return [];
    const out: { id: string; pair: string; text: string; minutes: number }[] = [];
    for (const ev of events) {
      const minutes = Math.round((new Date(ev.date).getTime() - Date.now()) / 60000);
      if (minutes < -120 || minutes > 8 * 60) continue;
      const ccy = ev.country.toUpperCase();
      for (const p of recent) {
        const usdProxy =
          ccy === "USD" && ["XAUUSD", "DXY", "SP500", "NASDAQ"].includes(p);
        if (p.includes(ccy) || usdProxy) {
          out.push({
            id: `${ev.id}-${p}`,
            pair: p,
            text:
              minutes > 0
                ? `${ev.title} (${ccy}) is scheduled in ${minutes} min — you traded ${p} this week.`
                : `${ev.title} (${ccy}) has been released — you traded ${p} this week.`,
            minutes,
          });
          break;
        }
      }
    }
    return out.sort((a, b) => Math.abs(a.minutes) - Math.abs(b.minutes)).slice(0, 3);
  }, [events, trades]);

  const refresh = () => {
    loadNews(category);
    loadCalendar(range);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-champagne mb-1">
            <Newspaper className="size-5" />
            <span className="text-[11px] uppercase tracking-[0.2em]">Market Intel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Facts first. You write the thesis.
          </h1>
          <p className="text-soft text-sm mt-1">
            Verified releases, context and scenarios — no signals, no direction calls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint">Now</div>
            <div className="text-sm font-mono text-soft mi-tick">
              {now.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={newsLoading}>
            <RefreshCcw className={cn("size-4", newsLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Section rail */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors",
                tab === t.key
                  ? "bg-champagne/10 border-champagne/50 text-champagne"
                  : "border-border text-soft hover:text-foreground hover:bg-accent/40",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {exposure.length > 0 && tab !== "thesis" && (
        <section className="space-y-2">
          {exposure.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-3 flex items-start gap-2 text-sm"
            >
              <span aria-hidden className="mt-1.5 size-2 rounded-full bg-champagne shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-faint mb-0.5">
                  Your exposure · {a.pair}
                </div>
                <div className="leading-snug">{a.text}</div>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "news" && (
            <NewsSection
              items={sortedNews}
              loading={newsLoading}
              category={category}
              setCategory={setCategory}
              syncedAt={newsSyncedAt}
              provider={newsProvider}
              stale={newsStale}
            />
          )}

          {tab === "calendar" && (
            <CalendarSection
              events={events}
              loading={calLoading}
              range={range}
              setRange={setRange}
              impactFilter={impactFilter}
              setImpactFilter={setImpactFilter}
              syncedAt={calSyncedAt}
              readings={readings}
              pending={calPending}
              expanded={calExpanded}
              onToggle={(id) => setCalExpanded((p) => ({ ...p, [id]: !p[id] }))}
            />
          )}

          {tab === "macro" && <MacroSection groups={macro} loading={macroLoading} />}

          {tab === "analysis" && (
            <AnalysisSection
              items={topHeadlines}
              readings={newsReadings}
              analyzing={analyzing}
            />
          )}

          {tab === "scenarios" && (
            <ScenariosSection
              events={weekEvents.length ? weekEvents : events}
              readings={readings}
            />

          )}

          {tab === "thesis" && <ThesisSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  News                                                                      */
/* -------------------------------------------------------------------------- */

const CATEGORIES: { key: "macro" | "forex" | "crypto"; label: string }[] = [
  { key: "macro", label: "Macro & Politics" },
  { key: "forex", label: "Forex & Metals" },
  { key: "crypto", label: "Crypto" },
];

function NewsSection({
  items,
  loading,
  category,
  setCategory,
  syncedAt,
  provider,
  stale,
}: {
  items: (FeedItem & { impact: Impact })[];
  loading: boolean;
  category: "macro" | "forex" | "crypto";
  setCategory: (c: "macro" | "forex" | "crypto") => void;
  syncedAt: string | null;
  provider: string;
  stale: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              category === c.key
                ? "bg-champagne/10 border-champagne/50 text-champagne"
                : "border-border text-soft hover:text-foreground hover:bg-accent/40",
            )}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-faint font-mono">
          {stale ? "Last known copy · " : "Synced "}
          {clockOf(syncedAt)}
          {provider && provider !== "none" ? ` · ${provider}` : ""}
        </span>
      </div>

      {loading && !items.length ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 w-full rounded-xl border border-border bg-card overflow-hidden mi-skeleton-shimmer"
            />
          ))}
        </div>
      ) : !items.length ? (
        <div className="text-center text-soft text-sm py-10 rounded-xl border border-border bg-card">
          No stories available right now.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(idx, 8) * 0.03 }}
              className={cn(
                "rounded-xl border border-border bg-card border-l-2 p-4",
                item.impact === "HIGH" ? "border-l-champagne" : "border-l-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-medium leading-snug">
                    {item.title}
                  </h3>
                  <div className="mt-1 text-[11px] text-faint flex items-center gap-2 flex-wrap">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>published {timeAgo(item.publishedAt)}</span>
                    {item.updatedAt && (
                      <>
                        <span>•</span>
                        <span>updated {timeAgo(item.updatedAt)}</span>
                      </>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-soft hover:text-champagne"
                      >
                        <ExternalLink className="size-3" /> source
                      </a>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border font-semibold",
                    item.impact === "HIGH"
                      ? "bg-champagne/10 text-champagne border-champagne/30"
                      : "bg-accent/30 text-soft border-border",
                  )}
                >
                  {item.impact}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Calendar                                                                  */
/* -------------------------------------------------------------------------- */

function parseNum(s: string): number | null {
  if (!s) return null;
  const m = String(s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function activeBand(forecast: string, actual: string): "above" | "on" | "below" | null {
  const f = parseNum(forecast);
  const a = parseNum(actual);
  if (f == null || a == null) return null;
  const tol = Math.max(Math.abs(f) * 0.02, 0.05);
  const diff = a - f;
  if (Math.abs(diff) <= tol) return "on";
  return diff > 0 ? "above" : "below";
}

function statusOf(ev: StoredEvent): { label: string; cls: string } {
  const minutes = Math.round((new Date(ev.date).getTime() - Date.now()) / 60000);
  if (ev.status === "revised")
    return { label: "Revised", cls: "bg-champagne/10 text-champagne border-champagne/30" };
  if (ev.status === "released" || ev.actual)
    return { label: "Released", cls: "bg-accent/40 text-soft border-border" };
  if (minutes >= -5 && minutes <= 5)
    return { label: "LIVE", cls: "bg-champagne/15 text-champagne border-champagne/40" };
  if (minutes > 5 && minutes <= 60)
    return { label: "Soon", cls: "bg-champagne/10 text-champagne border-champagne/30" };
  if (minutes < -5) return { label: "Awaiting data", cls: "bg-accent/40 text-soft border-border" };
  return { label: "Not released", cls: "bg-accent/30 text-soft border-border" };
}

function countdown(iso: string): string {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (m <= 0) return "";
  if (m < 60) return `in ${m}m`;
  return `in ${Math.floor(m / 60)}h ${m % 60}m`;
}

function CalendarSection({
  events,
  loading,
  range,
  setRange,
  impactFilter,
  setImpactFilter,
  syncedAt,
  readings,
  pending,
  expanded,
  onToggle,
}: {
  events: StoredEvent[];
  loading: boolean;
  range: "today" | "tomorrow" | "week";
  setRange: (r: "today" | "tomorrow" | "week") => void;
  impactFilter: "high" | "medium" | "low";
  setImpactFilter: (i: "high" | "medium" | "low") => void;
  syncedAt: string | null;
  readings: Record<string, CalendarReading>;
  pending: Record<string, boolean>;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock className="size-4 text-champagne" />
        <h2 className="text-sm font-medium tracking-wide">Economic Calendar</h2>
        <span className="text-[10px] text-faint font-mono">Synced {clockOf(syncedAt)}</span>
        <div className="ml-auto flex items-center gap-1 rounded-full border border-border p-0.5 bg-card">
          {(["today", "tomorrow", "week"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] capitalize transition-colors",
                range === r ? "bg-champagne/15 text-champagne" : "text-soft hover:text-foreground",
              )}
            >
              {r === "week" ? "This week" : r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">Impact</span>
        {(
          [
            { k: "high", label: "High only" },
            { k: "medium", label: "+ Medium" },
            { k: "low", label: "All" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            onClick={() => setImpactFilter(o.k)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
              impactFilter === o.k
                ? "bg-champagne/10 border-champagne/50 text-champagne"
                : "border-border text-soft hover:text-foreground hover:bg-accent/40",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading && !events.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-card mi-skeleton-shimmer" />
          ))}
        </div>
      ) : !events.length ? (
        <div className="text-center text-soft text-sm py-8 rounded-xl border border-border bg-card">
          No {impactFilter === "high" ? "high-impact " : ""}events for{" "}
          {range === "week" ? "this week" : range}.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((ev, i) => (
            <EventCard
              key={ev.id}
              ev={ev}
              index={i}
              reading={readings[ev.id]}
              pending={!!pending[ev.id]}
              expanded={!!expanded[ev.id]}
              onToggle={() => onToggle(ev.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({
  ev,
  index,
  reading,
  pending,
  expanded,
  onToggle,
}: {
  ev: StoredEvent;
  index: number;
  reading?: CalendarReading;
  pending: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = new Date(ev.date);
  const time = t.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const released = ev.status !== "scheduled" || !!ev.actual;
  const band = activeBand(ev.forecast, ev.actual);
  const status = statusOf(ev);
  const cd = countdown(ev.date);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-xl border border-border bg-card border-l-2 p-4 overflow-hidden",
        ev.impact === "HIGH" ? "border-l-champagne" : "border-l-border",
        released && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border font-semibold inline-flex items-center gap-1",
                ev.impact === "HIGH"
                  ? "bg-champagne/10 text-champagne border-champagne/30"
                  : "bg-accent/30 text-soft border-border",
              )}
            >
              {ev.impact === "HIGH" && (
                <span aria-hidden className="size-1.5 rounded-full bg-champagne" />
              )}
              {ev.impact}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border font-semibold",
                status.cls,
              )}
            >
              {status.label}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm md:text-base font-medium leading-snug">{ev.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/40 text-soft border border-border">
            {ev.country}
          </span>
          <span className="text-[11px] text-faint font-mono">{time}</span>
          {!released && cd && <span className="text-[10px] text-champagne font-mono">{cd}</span>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat
          label={ev.previousRevised ? "Previous (rev.)" : "Previous"}
          value={ev.previous || "—"}
          note={
            ev.previousRevised && ev.previousOriginal
              ? `was ${ev.previousOriginal}`
              : undefined
          }
        />
        <Stat label="Forecast" value={ev.forecast || "—"} highlight />
        <Stat
          label="Actual"
          value={ev.actual || "—"}
          tone={band === "above" ? "pos" : band === "below" ? "neg" : undefined}
          big
        />
      </div>

      {ev.impact !== "HOLIDAY" && (
        <>
          <button
            onClick={onToggle}
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-soft hover:text-champagne"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Reading {reading ? "" : pending ? "(pending)" : "(loading…)"}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {reading ? (
                  <ReadingBlock reading={reading} />
                ) : pending ? (
                  <p className="mt-3 text-xs text-faint">Reading not available yet.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    <div className="h-3 w-1/3 rounded bg-muted/40 animate-pulse" />
                    <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-muted/30 animate-pulse" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.article>
  );
}

function ReadingBlock({ reading }: { reading: NeutralReading }) {
  const rows: [string, string][] = [
    ["Fact", reading.fact],
    ["Interpretation", reading.interpretation],
    ["Context to verify", reading.context],
    ["Possible implication", reading.implication],
    ["Key uncertainty", reading.uncertainty],
  ];
  return (
    <div className="mt-3 grid gap-3 text-sm">
      {rows
        .filter(([, body]) => !!body)
        .map(([label, body]) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-0.5">
              {label}
            </div>
            <p className="text-soft leading-relaxed">{body}</p>
          </div>
        ))}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  tone,
  big,
  note,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "pos" | "neg";
  big?: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        highlight ? "border-champagne/30 bg-champagne/5" : "border-border bg-surface-2/40",
        tone === "pos" && "border-pos/40 bg-pos/10",
        tone === "neg" && "border-neg/40 bg-neg/10",
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{label}</div>
      <div
        className={cn(
          "font-mono font-semibold",
          big ? "text-lg" : "text-sm",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
        )}
      >
        {value}
      </div>
      {note && <div className="text-[10px] text-faint font-mono mt-0.5">{note}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Macro                                                                     */
/* -------------------------------------------------------------------------- */

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 76;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--champagne)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MacroSection({ groups, loading }: { groups: MacroGroup[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl border border-border bg-card mi-skeleton-shimmer" />
        ))}
      </div>
    );
  }
  if (!groups.length) {
    return (
      <div className="text-center text-soft text-sm py-10 rounded-xl border border-border bg-card">
        No macro history stored yet — it builds up as releases are collected.
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {groups.map((g) => (
        <section key={g.group} className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-medium tracking-wide tl-section-title">{g.group}</h2>
          <div className="mt-3 divide-y divide-border">
            {g.indicators.map((ind) => (
              <div key={ind.key} className="py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{ind.label}</div>
                  <div className="text-[11px] text-faint">
                    {ind.latestActual ? (
                      <>
                        <span className="font-mono text-soft">{ind.latestActual}</span>
                        {ind.latestPrevious && (
                          <> · prior <span className="font-mono">{ind.latestPrevious}</span></>
                        )}
                        {ind.latestDate && (
                          <> · {new Date(ind.latestDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
                        )}
                      </>
                    ) : (
                      "No release collected yet"
                    )}
                  </div>
                  {ind.nextDate && (
                    <div className="text-[10px] text-champagne font-mono mt-0.5">
                      next{" "}
                      {new Date(ind.nextDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
                <Sparkline values={ind.history} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Analysis                                                                  */
/* -------------------------------------------------------------------------- */

function AnalysisSection({
  items,
  readings,
  analyzing,
}: {
  items: FeedItem[];
  readings: Record<string, NeutralReading>;
  analyzing: boolean;
}) {
  if (!items.length) {
    return (
      <div className="text-center text-soft text-sm py-10 rounded-xl border border-border bg-card">
        No stories to explain right now.
      </div>
    );
  }
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-champagne" />
        <h2 className="text-sm font-medium tracking-wide">Fundamental analysis</h2>
        {analyzing && (
          <span className="ml-auto text-[11px] text-faint inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Reading…
          </span>
        )}
      </div>
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm md:text-base font-medium leading-snug">{item.title}</h3>
          <div className="mt-1 text-[11px] text-faint">
            {item.source} · {timeAgo(item.publishedAt)}
          </div>
          {readings[item.id] ? (
            <ReadingBlock reading={readings[item.id]} />
          ) : (
            <div className="mt-3 text-[11px] text-faint italic inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" /> Reading…
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scenarios                                                                 */
/* -------------------------------------------------------------------------- */

function ScenariosSection({
  events,
  readings,
}: {
  events: StoredEvent[];
  readings: Record<string, CalendarReading>;
}) {
  const upcoming = events
    .filter((e) => e.impact === "HIGH" && e.status === "scheduled" && !e.actual)
    .slice(0, 6);

  if (!upcoming.length) {
    return (
      <div className="text-center text-soft text-sm py-10 rounded-xl border border-border bg-card">
        No high-impact releases left in this range. Switch the calendar range to see more.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <p className="text-xs text-soft">
        Outcome bands with what each would mean — evidence to check, not a recommendation.
      </p>
      {upcoming.map((ev) => {
        const r = readings[ev.id];
        return (
          <article key={ev.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm md:text-base font-medium">{ev.title}</h3>
              <span className="text-[11px] text-faint font-mono shrink-0">
                {ev.country} ·{" "}
                {new Date(ev.date).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Band
                label="Above forecast"
                body={`Reading comes in higher than the ${ev.forecast || "consensus"} estimate. Check whether the surprise is broad or concentrated in volatile components.`}
              />
              <Band
                label="In line"
                body={`Reading matches the ${ev.forecast || "consensus"} estimate. The prior trend is unchanged; revisions to earlier data matter more than the headline.`}
              />
              <Band
                label="Below forecast"
                body={`Reading comes in lower than the ${ev.forecast || "consensus"} estimate. Check whether the shortfall is one-off or part of a run of softer prints.`}
              />
            </div>
            {r && (
              <div className="mt-3 border-t border-border pt-3">
                <ReadingBlock reading={r} />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function Band({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-faint">{label}</div>
      <p className="text-xs text-soft leading-relaxed mt-1">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Thesis                                                                    */
/* -------------------------------------------------------------------------- */

type ThesisRow = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};

function ThesisSection() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ThesisRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [critique, setCritique] = useState<string>("");
  const [reviewing, setReviewing] = useState(false);
  const review = useServerFn(critiqueThesis);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("market_thesis")
      .select("id, title, body, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);
    setRows((data ?? []) as ThesisRow[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!user || body.trim().length < 10) return;
    setSaving(true);
    await supabase.from("market_thesis").insert({
      user_id: user.id,
      title: title.trim() || "Untitled thesis",
      body: body.trim(),
    });
    setTitle("");
    setBody("");
    setSaving(false);
    load();
  };

  const runReview = async () => {
    if (body.trim().length < 10) return;
    setReviewing(true);
    setCritique("");
    const r = await review({ data: { thesis: body.trim() } });
    setCritique(r.critique || r.error || "");
    setReviewing(false);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-medium tracking-wide">Your thesis</h2>
          <p className="text-xs text-soft mt-0.5">
            Write your own read on the week. Vesper can question it — it never writes it for you.
          </p>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-champagne/50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="What do you think is driving the market this week, and what evidence are you using?"
          className="w-full rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm outline-none focus:border-champagne/50 resize-y"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={saving || body.trim().length < 10}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save thesis
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runReview}
            disabled={reviewing || body.trim().length < 10}
          >
            {reviewing ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" />}
            Question my thesis
          </Button>
        </div>
        {critique && (
          <div className="rounded-lg border border-champagne/30 bg-champagne/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-champagne mb-1">
              What is missing
            </div>
            <p className="text-sm text-soft whitespace-pre-wrap leading-relaxed">{critique}</p>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-faint">Saved</h3>
          {rows.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-medium">{r.title}</h4>
                <span className="text-[10px] text-faint font-mono shrink-0">
                  {new Date(r.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm text-soft whitespace-pre-wrap mt-1 leading-relaxed">
                {r.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
