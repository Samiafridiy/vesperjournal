import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  CalendarClock,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerFn } from "@tanstack/react-start";
import {
  getMarketNews,
  analyzeHeadlines,
  getEconomicCalendar,
  analyzeCalendar,
  type NewsItem,
  type NewsAnalysis,
  type CalendarEvent,
  type CalendarAnalysis,
} from "@/server/market.functions";
import { useTrades } from "@/hooks/use-trades";
import { cn } from "@/lib/utils";
import {
  impactRank,
  classifyHeadlineImpact,
  type Impact,
} from "@/lib/economic-calendar";

export const Route = createFileRoute("/market-intel")({
  head: () => ({
    meta: [
      { title: "Market Intel — Vesper Journal" },
      {
        name: "description",
        content:
          "Live forex, gold, and crypto news with AI analysis — know what's moving the market before you trade.",
      },
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

type FilterKey = "all" | "high" | "gold" | "major" | "crypto";
type Enriched = NewsItem & { analysis?: NewsAnalysis; impact: Impact };

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All news" },
  { key: "high", label: "High impact" },
  { key: "gold", label: "Gold (XAUUSD)" },
  { key: "major", label: "Major pairs" },
  { key: "crypto", label: "Crypto" },
];

const QUICK_BIAS_PAIRS = [
  "EURUSD",
  "XAUUSD",
  "GBPUSD",
  "USDJPY",
  "SP500",
  "NASDAQ",
  "DXY",
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
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function MarketIntelPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Calendar state
  const [range, setRange] = useState<"today" | "tomorrow" | "week">("today");
  const [impactFilter, setImpactFilter] = useState<"high" | "medium" | "low">("high");
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [calAnalysis, setCalAnalysis] = useState<Record<string, CalendarAnalysis>>({});
  const [calLoading, setCalLoading] = useState(true);
  const [calError, setCalError] = useState<string | null>(null);
  const [calExpanded, setCalExpanded] = useState<Record<string, boolean>>({});

  const fetchNews = useServerFn(getMarketNews);
  const fetchAnalysis = useServerFn(analyzeHeadlines);
  const fetchCalendar = useServerFn(getEconomicCalendar);
  const fetchCalAnalysis = useServerFn(analyzeCalendar);
  const { trades } = useTrades();

  const load = useCallback(
    async (f: FilterKey) => {
      setLoading(true);
      setError(null);
      const r = await fetchNews({ data: { filter: f } });
      if (r.error) setError(r.error);
      const base: Enriched[] = (r.items ?? []).map((i) => ({
        ...i,
        impact: classifyHeadlineImpact(i.title),
      }));
      setItems(base);
      setLoading(false);

      if (base.length === 0) return;
      setAnalyzing(true);
      const headlines = base.slice(0, 12).map((i) => i.title);
      const a = await fetchAnalysis({ data: { headlines } });
      if (a.results?.length) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx < a.results.length ? { ...it, analysis: a.results[idx] } : it,
          ),
        );
      } else if (a.error) {
        setError(a.error);
      }
      setAnalyzing(false);
    },
    [fetchNews, fetchAnalysis],
  );

  useEffect(() => {
    load(filter);
    const t = setInterval(() => load(filter), 5 * 60_000);
    return () => clearInterval(t);
  }, [filter, load]);

  // Load calendar + AI analysis (refresh every 5 min)
  const loadCalendar = useCallback(
    async (r: "today" | "tomorrow" | "week") => {
      setCalLoading(true);
      setCalError(null);
      const res = await fetchCalendar({ data: { range: r } });
      if (res.error) setCalError(res.error);
      const evs = res.events ?? [];
      setCalEvents(evs);
      setCalLoading(false);

      // Analyze top 12 by impact + soonest
      const top = [...evs]
        .filter((e) => e.impact !== "HOLIDAY")
        .sort((a, b) => {
          const rk = (i: CalendarEvent["impact"]) =>
            i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : 2;
          const d = rk(a.impact) - rk(b.impact);
          if (d !== 0) return d;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        })
        .slice(0, 12);
      if (top.length === 0) return;
      const a = await fetchCalAnalysis({
        data: {
          events: top.map((e) => ({
            id: e.id,
            title: e.title,
            country: e.country,
            impact: e.impact,
            forecast: e.forecast,
            previous: e.previous,
          })),
        },
      });
      if (a.results?.length) {
        setCalAnalysis((prev) => {
          const next = { ...prev };
          for (const r of a.results) {
            next[r.id] = {
              shortTerm: r.shortTerm,
              longTerm: r.longTerm,
              above: r.above,
              on: r.on,
              below: r.below,
            };
          }
          return next;
        });
      }
    },
    [fetchCalendar, fetchCalAnalysis],
  );

  useEffect(() => {
    setCalAnalysis({});
    loadCalendar(range);
    const t = setInterval(() => loadCalendar(range), 5 * 60_000);
    return () => clearInterval(t);
  }, [range, loadCalendar]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const bias = useMemo(() => {
    const map: Record<string, { bull: number; bear: number }> = {};
    for (const p of QUICK_BIAS_PAIRS) map[p] = { bull: 0, bear: 0 };
    for (const it of items) {
      const a = it.analysis;
      if (!a) continue;
      for (const pair of a.pairs) {
        const key = normalizePair(pair);
        if (!map[key]) continue;
        if (a.sentiment === "bullish") map[key].bull += 1;
        else if (a.sentiment === "bearish") map[key].bear += 1;
      }
    }
    return map;
  }, [items]);

  const events = useMemo(() => {
    const allow = new Set<CalendarEvent["impact"]>(
      impactFilter === "high"
        ? ["HIGH"]
        : impactFilter === "medium"
          ? ["HIGH", "MEDIUM"]
          : ["HIGH", "MEDIUM", "LOW", "HOLIDAY"],
    );
    const filtered = calEvents.filter((e) => allow.has(e.impact));
    const rk = (i: CalendarEvent["impact"]) =>
      i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : i === "LOW" ? 2 : 3;
    const nowMs = Date.now();
    return [...filtered].sort((a, b) => {
      const aReleased = !!a.actual || new Date(a.date).getTime() < nowMs - 60 * 60_000;
      const bReleased = !!b.actual || new Date(b.date).getTime() < nowMs - 60 * 60_000;
      if (aReleased !== bReleased) return aReleased ? 1 : -1;
      const r = rk(a.impact) - rk(b.impact);
      if (r !== 0) return r;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [calEvents, impactFilter]);

  // "How this affects your trades" — recently traded pairs vs today's high-impact events + news
  const personalAlerts = useMemo(() => {
    const since = Date.now() - 14 * 86_400_000;
    const recentPairs = new Set(
      (trades ?? [])
        .filter((t) => t.trade_date && new Date(t.trade_date).getTime() >= since)
        .map((t) => normalizePair(t.pair || "")),
    );
    if (recentPairs.size === 0) return [];
    type Alert = {
      id: string;
      pair: string;
      title: string;
      urgency: "high" | "medium";
      minutesUntil?: number;
    };
    const alerts: Alert[] = [];

    // Match upcoming high-impact events to user's recent currency exposure
    for (const ev of events) {
      const minutes = Math.round((new Date(ev.date).getTime() - Date.now()) / 60000);
      if (minutes < -120 || minutes > 8 * 60) continue;
      const ccy = ev.country.toUpperCase();
      for (const p of recentPairs) {
        if (p.includes(ccy) || (ccy === "USD" && (p === "XAUUSD" || p === "DXY" || p === "SP500" || p === "NASDAQ"))) {
          const urgency: "high" | "medium" =
            ev.impact === "HIGH" && minutes <= 60 && minutes >= -15 ? "high" : "medium";
          alerts.push({
            id: `${ev.id}-${p}`,
            pair: p,
            title:
              minutes > 0
                ? `${ev.title} releases in ${minutes} min — you have ${p} exposure`
                : minutes > -15
                  ? `${ev.title} just released — watch ${p}`
                  : `${ev.title} earlier today may still affect ${p}`,
            urgency,
            minutesUntil: minutes,
          });
          break;
        }
      }
    }

    // Plus news headlines mentioning their pairs
    for (const it of items) {
      const a = it.analysis;
      if (!a) continue;
      for (const p of a.pairs) {
        const up = normalizePair(p);
        if (recentPairs.has(up) && !alerts.find((x) => x.pair === up && x.title === it.title)) {
          alerts.push({
            id: it.id,
            pair: up,
            title: `${it.title} — affects ${up}`,
            urgency: it.impact === "HIGH" ? "high" : "medium",
          });
        }
      }
    }

    return alerts.slice(0, 5);
  }, [items, trades, events]);

  // Sort news: HIGH first, then MEDIUM, LOW; within group most recent first
  const sortedItems = useMemo(() => {
    const rank = (i: Impact) => (i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : 2);
    return [...items].sort((a, b) => {
      const r = rank(a.impact) - rank(b.impact);
      if (r !== 0) return r;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [items]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-champagne mb-1">
            <Newspaper className="size-5" />
            <span className="text-[11px] uppercase tracking-[0.2em]">Market Intel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Know what&apos;s moving the market
          </h1>
          <p className="text-soft text-sm mt-1">
            Live news with AI analysis — read it before you trade.
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(filter)}
            disabled={loading || analyzing}
          >
            <RefreshCcw className={cn("size-4", (loading || analyzing) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Quick bias — horizontally scrollable on mobile */}
      <section
        className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-7"
      >
        {QUICK_BIAS_PAIRS.map((p, i) => {
          const b = bias[p] ?? { bull: 0, bear: 0 };
          const total = b.bull + b.bear;
          const tone =
            total === 0
              ? "neutral"
              : b.bull > b.bear
                ? "bullish"
                : b.bear > b.bull
                  ? "bearish"
                  : "neutral";
          return <BiasCard key={p} pair={p} tone={tone} count={total} index={i} />;
        })}
      </section>

      {/* Personal alerts */}
      {personalAlerts.length > 0 && (
        <section className="space-y-2">
          {personalAlerts.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl border p-3 flex items-start gap-2 text-sm",
                a.urgency === "high"
                  ? "border-neg/40 bg-neg/10 text-foreground mi-glow-red"
                  : "border-champagne/30 bg-champagne/5 text-foreground",
              )}
            >
              <AlertTriangle
                className={cn(
                  "size-4 mt-0.5 shrink-0",
                  a.urgency === "high" ? "text-neg" : "text-champagne",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-faint mb-0.5">
                  {a.urgency === "high" ? "High urgency" : "Heads up"} · {a.pair}
                </div>
                <div className="leading-snug">{a.title}</div>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {/* Economic Calendar Playbook */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarClock className="size-4 text-champagne" />
          <h2 className="text-sm font-medium tracking-wide">Economic Calendar</h2>
          <span className="text-[10px] text-faint">live · sorted by impact</span>
          <div className="ml-auto flex items-center gap-1 rounded-full border border-border p-0.5 bg-card">
            {(["today", "tomorrow", "week"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] capitalize transition-colors",
                  range === r
                    ? "bg-champagne/15 text-champagne"
                    : "text-soft hover:text-foreground",
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
              { k: "high", label: "🔥 High only" },
              { k: "medium", label: "🟡 + Medium" },
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
          {calError && (
            <span className="ml-auto text-[11px] text-neg">{calError}</span>
          )}
        </div>
        {calLoading && events.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-border bg-card mi-skeleton-shimmer"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-soft text-sm py-8 rounded-xl border border-border bg-card">
            No {impactFilter === "high" ? "high-impact" : ""} events for{" "}
            {range === "week" ? "this week" : range}.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((ev, i) => (
              <EventCard
                key={ev.id}
                ev={ev}
                index={i}
                analysis={calAnalysis[ev.id]}
                expanded={!!calExpanded[ev.id]}
                onToggle={() =>
                  setCalExpanded((p) => ({ ...p, [ev.id]: !p[ev.id] }))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              filter === f.key
                ? "bg-champagne/10 border-champagne/50 text-champagne"
                : "border-border text-soft hover:text-foreground hover:bg-accent/40",
            )}
          >
            {f.label}
          </button>
        ))}
        {analyzing && (
          <span className="ml-auto text-[11px] text-faint self-center">
            AI analyzing headlines…
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-neg/40 bg-neg/10 px-3 py-2 text-sm text-neg">
          {error}
        </div>
      )}

      {/* News feed */}
      <section className="space-y-3">
        {loading && items.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 w-full rounded-xl border border-border bg-card overflow-hidden mi-skeleton-shimmer"
              />
            ))
          : sortedItems.map((item, idx) => (
              <NewsCard
                key={item.id}
                item={item}
                index={idx}
                expanded={!!expanded[item.id]}
                onToggle={() =>
                  setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))
                }
              />
            ))}
        {!loading && items.length === 0 && (
          <div className="text-center text-soft text-sm py-10">
            No news available right now.
          </div>
        )}
      </section>
    </div>
  );
}

function BiasCard({
  pair,
  tone,
  count,
  index,
}: {
  pair: string;
  tone: "bullish" | "bearish" | "neutral";
  count: number;
  index: number;
}) {
  const Icon = tone === "bullish" ? TrendingUp : tone === "bearish" ? TrendingDown : Minus;
  const color =
    tone === "bullish"
      ? "text-pos border-pos/30 bg-pos/5"
      : tone === "bearish"
        ? "text-neg border-neg/30 bg-neg/5"
        : "text-soft border-border bg-accent/20";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl border p-3 flex items-center justify-between min-w-[160px] md:min-w-0 shrink-0",
        color,
      )}
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{pair}</div>
        <div className={cn("text-sm font-medium capitalize", tone !== "neutral" && "mi-pulse")}>
          {tone}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <Icon className={cn("size-4", tone !== "neutral" && "mi-arrow")} />
        <span className="text-[10px] text-faint mt-1">
          {count} signal{count === 1 ? "" : "s"}
        </span>
      </div>
    </motion.div>
  );
}

function NewsCard({
  item,
  expanded,
  onToggle,
  index,
}: {
  item: Enriched;
  expanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const a = item.analysis;
  const sentiment = a?.sentiment ?? "neutral";
  const borderTone =
    sentiment === "bullish"
      ? "border-l-pos"
      : sentiment === "bearish"
        ? "border-l-neg"
        : "border-l-border";

  const sentimentBadge =
    sentiment === "bullish"
      ? "bg-pos/10 text-pos border-pos/30"
      : sentiment === "bearish"
        ? "bg-neg/10 text-neg border-neg/30"
        : "bg-accent/30 text-soft border-border";

  const impactBadge =
    item.impact === "HIGH"
      ? "bg-neg/15 text-neg border-neg/40 mi-glow-red"
      : item.impact === "MEDIUM"
        ? "bg-champagne/10 text-champagne border-champagne/30"
        : "bg-accent/30 text-soft border-border";

  return (
    <motion.article
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl border border-border bg-card border-l-4 p-4",
        borderTone,
      )}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-medium leading-snug">
            {item.title}
          </h3>
          <div className="mt-1 text-[11px] text-faint flex items-center gap-2 flex-wrap">
            <span>{item.source}</span>
            <span>•</span>
            <span>{timeAgo(item.publishedAt)}</span>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border font-semibold",
              impactBadge,
            )}
          >
            {item.impact}
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border",
              sentimentBadge,
            )}
          >
            {sentiment}
          </span>
          {a?.pairs?.slice(0, 4).map((p) => (
            <span
              key={p}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent/40 text-soft border border-border"
            >
              {normalizePair(p)}
            </span>
          ))}
        </div>
      </div>

      {a && (
        <>
          <button
            onClick={onToggle}
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-soft hover:text-champagne"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            AI analysis
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid gap-3 text-sm">
                  <AnalysisRow label="What happened" body={a.summary} />
                  <AnalysisRow label="Short term (1–4h)" body={a.shortTerm} />
                  <AnalysisRow label="Longer term (1–7d)" body={a.longTerm} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      {!a && (
        <div className="mt-2 text-[11px] text-faint italic">
          AI analysis pending…
        </div>
      )}
    </motion.article>
  );
}

function AnalysisRow({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-0.5">
        {label}
      </div>
      <p className="text-soft leading-relaxed">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Economic event card                                                        */
/* -------------------------------------------------------------------------- */

function Sparkline({ values, tone }: { values: number[]; tone: "pos" | "neg" | "soft" }) {
  if (!values.length) return null;
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke =
    tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : "oklch(1 0 0 / 45%)";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EventCard({ ev, index }: { ev: EconomicEvent; index: number }) {
  const t = new Date(ev.time);
  const time = t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const minutesAway = Math.round((t.getTime() - Date.now()) / 60000);
  const released = ev.actualNumber != null;
  const active = activeScenario(ev);

  const leftBorder =
    ev.impact === "HIGH"
      ? "border-l-neg"
      : ev.impact === "MEDIUM"
        ? "border-l-champagne"
        : "border-l-border";

  const impactBadge =
    ev.impact === "HIGH"
      ? "bg-neg/15 text-neg border-neg/40 mi-glow-red"
      : ev.impact === "MEDIUM"
        ? "bg-champagne/10 text-champagne border-champagne/30"
        : "bg-accent/30 text-soft border-border";

  const trendTone: "pos" | "neg" | "soft" =
    ev.history.length >= 2
      ? ev.history[ev.history.length - 1] > ev.history[0]
        ? "pos"
        : ev.history[ev.history.length - 1] < ev.history[0]
          ? "neg"
          : "soft"
      : "soft";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-xl border border-border bg-card border-l-4 p-4 overflow-hidden",
        leftBorder,
      )}
    >
      {ev.impact === "HIGH" && (
        <div className="pointer-events-none absolute inset-0 mi-shimmer" aria-hidden />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border font-semibold inline-flex items-center gap-1",
                impactBadge,
              )}
            >
              {ev.impact === "HIGH" && <Flame className="size-3" />}
              {ev.impact}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/40 text-soft border border-border">
              {ev.currency}
            </span>
            <span className="text-[11px] text-faint font-mono">{time}</span>
            {!released && minutesAway > 0 && minutesAway <= 240 && (
              <span className="text-[10px] text-champagne">in {minutesAway}m</span>
            )}
            {released && (
              <span className="text-[10px] text-pos">released</span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm md:text-base font-medium leading-snug">
            {ev.name}
          </h3>
        </div>
        <Sparkline values={ev.history} tone={trendTone} />
      </div>

      {/* Previous | Forecast | Actual */}
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <Stat label="Previous" value={ev.previous} />
        <Stat label="Forecast" value={ev.forecast} highlight />
        <Stat
          label="Actual"
          value={released ? `${ev.actualNumber}${ev.unit ?? ""}` : "—"}
          tone={
            active === "above" ? "pos" : active === "below" ? "neg" : undefined
          }
          big
        />
      </div>

      {/* Playbook scenarios */}
      <div className="relative mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Scenario data={ev.playbook.above} active={active === "above"} />
        <Scenario data={ev.playbook.on} active={active === "on"} />
        <Scenario data={ev.playbook.below} active={active === "below"} />
      </div>

      <p className="relative mt-3 text-[12px] text-soft leading-relaxed">
        <span className="text-faint">What this means: </span>
        {ev.meaning}
      </p>
    </motion.article>
  );
}

function Stat({
  label,
  value,
  highlight,
  tone,
  big,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "pos" | "neg";
  big?: boolean;
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
    </div>
  );
}

function Scenario({
  data,
  active,
}: {
  data: { label: string; outcome: string; tone: "bullish" | "bearish" | "neutral" };
  active: boolean;
}) {
  const toneClass =
    data.tone === "bullish"
      ? "border-pos/30 text-pos"
      : data.tone === "bearish"
        ? "border-neg/30 text-neg"
        : "border-border text-soft";
  const activeBg =
    data.tone === "bullish"
      ? "bg-pos/15 border-pos/60"
      : data.tone === "bearish"
        ? "bg-neg/15 border-neg/60"
        : "bg-accent/40 border-border";
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 transition-colors",
        active ? activeBg : cn("bg-card", toneClass),
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.16em] text-faint">{data.label}</div>
      <div className={cn("text-xs font-medium mt-0.5", toneClass.split(" ").pop())}>
        {data.outcome}
      </div>
    </div>
  );
}