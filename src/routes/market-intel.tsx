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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerFn } from "@tanstack/react-start";
import { getMarketNews, analyzeHeadlines, type NewsItem, type NewsAnalysis } from "@/server/market.functions";
import { useTrades } from "@/hooks/use-trades";
import { cn } from "@/lib/utils";

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
type Enriched = NewsItem & { analysis?: NewsAnalysis };

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All news" },
  { key: "high", label: "High impact" },
  { key: "gold", label: "Gold (XAUUSD)" },
  { key: "major", label: "Major pairs" },
  { key: "crypto", label: "Crypto" },
];

const QUICK_BIAS_PAIRS = ["EURUSD", "XAUUSD", "GBPUSD", "USDJPY"];

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

  const fetchNews = useServerFn(getMarketNews);
  const fetchAnalysis = useServerFn(analyzeHeadlines);
  const { trades } = useTrades();

  const load = useCallback(
    async (f: FilterKey) => {
      setLoading(true);
      setError(null);
      const r = await fetchNews({ data: { filter: f } });
      if (r.error) setError(r.error);
      const base: Enriched[] = (r.items ?? []).map((i) => ({ ...i }));
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
        const key = pair.toUpperCase();
        if (!map[key]) continue;
        if (a.sentiment === "bullish") map[key].bull += 1;
        else if (a.sentiment === "bearish") map[key].bear += 1;
      }
    }
    return map;
  }, [items]);

  // "How this affects your trades" — match recently traded pairs to today's news
  const personalAlerts = useMemo(() => {
    const since = Date.now() - 14 * 86_400_000;
    const recentPairs = new Set(
      (trades ?? [])
        .filter((t) => t.trade_date && new Date(t.trade_date).getTime() >= since)
        .map((t) => (t.pair || "").toUpperCase()),
    );
    if (recentPairs.size === 0) return [];
    const alerts: { pair: string; title: string; id: string }[] = [];
    for (const it of items) {
      const a = it.analysis;
      if (!a) continue;
      for (const p of a.pairs) {
        const up = p.toUpperCase();
        if (recentPairs.has(up) && !alerts.find((x) => x.pair === up)) {
          alerts.push({ pair: up, title: it.title, id: it.id });
        }
      }
    }
    return alerts.slice(0, 3);
  }, [items, trades]);

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
            <div className="text-sm font-mono text-soft">
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

      {/* Quick bias */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_BIAS_PAIRS.map((p) => {
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
          return <BiasCard key={p} pair={p} tone={tone} count={total} />;
        })}
      </section>

      {/* Personal alerts */}
      {personalAlerts.length > 0 && (
        <section className="rounded-xl border border-champagne/30 bg-champagne/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-champagne text-sm font-medium">
            <AlertTriangle className="size-4" />
            How this affects your trades
          </div>
          <ul className="space-y-1.5 text-sm text-soft">
            {personalAlerts.map((a) => (
              <li key={a.id}>
                You recently traded <span className="text-foreground font-medium">{a.pair}</span> —{" "}
                <span className="text-foreground">{a.title}</span> may affect it today.
              </li>
            ))}
          </ul>
        </section>
      )}

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
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))
          : items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
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
}: {
  pair: string;
  tone: "bullish" | "bearish" | "neutral";
  count: number;
}) {
  const Icon = tone === "bullish" ? TrendingUp : tone === "bearish" ? TrendingDown : Minus;
  const color =
    tone === "bullish"
      ? "text-pos border-pos/30 bg-pos/5"
      : tone === "bearish"
        ? "text-neg border-neg/30 bg-neg/5"
        : "text-soft border-border bg-accent/20";
  return (
    <div className={cn("rounded-xl border p-3 flex items-center justify-between", color)}>
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{pair}</div>
        <div className="text-sm font-medium capitalize">{tone}</div>
      </div>
      <div className="flex flex-col items-end">
        <Icon className="size-4" />
        <span className="text-[10px] text-faint mt-1">
          {count} signal{count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function NewsCard({
  item,
  expanded,
  onToggle,
}: {
  item: Enriched;
  expanded: boolean;
  onToggle: () => void;
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
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
              {p}
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