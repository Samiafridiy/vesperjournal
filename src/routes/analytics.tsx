import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useTrades } from "@/hooks/use-trades";
import { fmtMoney, fmtPct, generateInsights, type Trade } from "@/lib/trade-utils";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Vesper Journal" },
      { name: "description", content: "Smart insights into your trading performance." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <Analytics />
      </AppShell>
    </RouteGate>
  ),
});

function aggregate<K extends string>(trades: Trade[], key: (t: Trade) => K | null) {
  const map = new Map<K, { wins: number; losses: number; pnl: number; n: number }>();
  for (const t of trades) {
    const k = key(t);
    if (!k) continue;
    const e = map.get(k) ?? { wins: 0, losses: 0, pnl: 0, n: 0 };
    if (t.result === "win") e.wins++;
    else if (t.result === "loss") e.losses++;
    e.pnl += t.pnl ?? 0;
    e.n += 1;
    map.set(k, e);
  }
  return Array.from(map.entries()).map(([name, v]) => ({
    name,
    ...v,
    winRate: v.n > 0 ? (v.wins / v.n) * 100 : 0,
  }));
}

function Analytics() {
  const { trades } = useTrades();
  const closed = useMemo(() => trades.filter((t) => t.pnl != null), [trades]);

  const byPair = useMemo(() => aggregate(closed, (t) => t.pair).sort((a, b) => b.pnl - a.pnl), [closed]);
  const bySession = useMemo(() => aggregate(closed, (t) => t.session).sort((a, b) => b.pnl - a.pnl), [closed]);
  const byStrategy = useMemo(() => aggregate(closed, (t) => t.strategy).sort((a, b) => b.pnl - a.pnl), [closed]);
  const byEmotion = useMemo(() => aggregate(closed, (t) => t.emotion_before).sort((a, b) => b.pnl - a.pnl), [closed]);

  const mistakeAgg = useMemo(() => {
    const m = new Map<string, { count: number; pnl: number }>();
    for (const t of closed) {
      for (const tag of t.mistakes ?? []) {
        const e = m.get(tag) ?? { count: 0, pnl: 0 };
        e.count++;
        e.pnl += t.pnl ?? 0;
        m.set(tag, e);
      }
    }
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
  }, [closed]);

  const insights = useMemo(() => generateInsights(trades), [trades]);

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">
      <header className="border-b border-border pb-6 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft mb-2">Deep dive</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-soft mt-2">What's actually working — and what isn't.</p>
      </header>

      {/* Insights */}
      <section className="mb-8 surface-card-elevated top-accent p-6 md:p-7">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">Smart insights</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i}
              className={
                "rounded-lg p-4 border " +
                (ins.tone === "warn"
                  ? "border-neg/20 bg-neg/10"
                  : ins.tone === "good"
                  ? "border-pos/20 bg-pos/10"
                  : "border-border bg-surface")
              }>
              <div className="text-sm font-medium">{ins.title}</div>
              <div className="text-xs text-soft mt-1 leading-relaxed">{ins.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="P&L by pair" subtitle="Best to worst">
          <PnlBars data={byPair} />
        </ChartCard>
        <ChartCard title="P&L by session" subtitle="Where your edge lives">
          <PnlBars data={bySession} />
        </ChartCard>
        <ChartCard title="Win rate by strategy" subtitle="Which setups deliver">
          <WinRateBars data={byStrategy} />
        </ChartCard>
        <ChartCard title="P&L by emotion (entry)" subtitle="Your mind vs your money">
          <PnlBars data={byEmotion} />
        </ChartCard>
      </section>

      {/* Mistakes table */}
      <section className="mt-5 surface-card p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium mb-4">Mistake tags</div>
        {mistakeAgg.length === 0 ? (
          <p className="text-soft text-sm">No mistakes tagged yet. Keep journaling honestly — it's where the gains hide.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mistakeAgg.map((m) => (
              <div key={m.name} className="bg-surface-2 border border-border rounded-lg p-4">
                <div className="font-medium">{m.name}</div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-xs text-soft">{m.count} trade{m.count === 1 ? "" : "s"}</span>
                  <span className={`font-mono text-sm tabular-nums ${m.pnl >= 0 ? "text-pos" : "text-neg"}`}>
                    {fmtMoney(m.pnl, { sign: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-6 min-h-[320px] flex flex-col">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">{title}</div>
        <div className="text-xs text-soft mt-0.5">{subtitle}</div>
      </div>
      <div className="flex-1 -ml-2 min-h-[220px]">{children}</div>
    </div>
  );
}

function PnlBars({ data }: { data: { name: string; pnl: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false}
          tickFormatter={(v) => fmtMoney(v as number)} width={70} />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
          formatter={(v) => [fmtMoney(Number(v), { sign: true }), "P&L"]}
          cursor={{ fill: "var(--accent)" }}
        />
        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? "var(--pos)" : "var(--neg)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WinRateBars({ data }: { data: { name: string; winRate: number; n: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v}%`} width={50} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
          formatter={(v) => [fmtPct(Number(v)), "Win rate"]}
          cursor={{ fill: "var(--accent)" }}
        />
        <Bar dataKey="winRate" radius={[6, 6, 0, 0]} fill="var(--champagne)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-faint">
      Not enough data yet.
    </div>
  );
}