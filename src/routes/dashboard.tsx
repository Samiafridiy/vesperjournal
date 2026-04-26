import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useTrades } from "@/hooks/use-trades";
import { computeStats, equityCurve, fmtMoney, fmtPct, generateInsights } from "@/lib/trade-utils";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles, TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Aegis" },
      { name: "description", content: "Your trading performance at a glance." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RouteGate>
  ),
});

function Dashboard() {
  const { trades, loading } = useTrades();
  const stats = useMemo(() => computeStats(trades), [trades]);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const insights = useMemo(() => generateInsights(trades), [trades]);

  const winLossData = [
    { name: "Wins", value: stats.wins, color: "var(--pos)" },
    { name: "Losses", value: stats.losses, color: "var(--neg)" },
  ];

  const empty = !loading && trades.length === 0;

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="size-2 bg-champagne rounded-full glow-champagne" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
              Session Overview
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Performance at a glance
          </h1>
        </div>
        <Link to="/trade/new">
          <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11">
            <PlusCircle className="size-4" /> Log a trade
          </Button>
        </Link>
      </header>

      {empty ? <EmptyState /> : (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Net P&L"
              tone={stats.totalPnl >= 0 ? "pos" : "neg"}
              value={fmtMoney(stats.totalPnl, { sign: true })}
              sub={`${stats.closed} closed trades`}
            />
            <StatCard
              label="Win Rate"
              value={fmtPct(stats.winRate)}
              sub={`${stats.wins}W · ${stats.losses}L`}
            />
            <StatCard
              label="Avg R:R"
              value={stats.avgRR.toFixed(2)}
              sub="Risk multiple per trade"
            />
            <StatCard
              label="Streak"
              tone={stats.streakType === "win" ? "pos" : stats.streakType === "loss" ? "neg" : "neutral"}
              value={stats.streak === 0 ? "—" : `${stats.streak}`}
              sub={
                <span className="flex items-center gap-1.5">
                  {stats.streakType === "win" && <TrendingUp className="size-3.5 text-pos" />}
                  {stats.streakType === "loss" && <TrendingDown className="size-3.5 text-neg" />}
                  {stats.streakType ? `${stats.streakType} streak` : "No active streak"}
                </span>
              }
            />
          </section>

          {/* Chart + insights */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            <div className="lg:col-span-8 surface-card p-6 min-h-[360px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
                    Equity Curve
                  </div>
                  <div className="text-sm text-soft mt-0.5">Cumulative P&L over time</div>
                </div>
                <div className="font-mono text-xs text-soft">{curve.length} trades</div>
              </div>
              <div className="flex-1 min-h-[260px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curve} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--champagne)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--champagne)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="i" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => fmtMoney(v as number)}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [fmtMoney(v, { sign: true }), "Equity"]}
                      labelFormatter={(l) => `Trade #${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="var(--champagne)"
                      strokeWidth={2}
                      fill="url(#eq)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 surface-card-elevated top-accent p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="size-4 text-champagne" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
                  Smart insights
                </span>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className={
                      "rounded-lg p-4 border " +
                      (ins.tone === "warn"
                        ? "border-neg/20 bg-neg/10"
                        : ins.tone === "good"
                        ? "border-pos/20 bg-pos/10"
                        : "border-border bg-surface")
                    }
                  >
                    <div className="text-sm font-medium">{ins.title}</div>
                    <div className="text-xs text-soft mt-1 leading-relaxed">{ins.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Win/Loss + recent */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 surface-card p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium mb-4">
                Win / Loss split
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="var(--background)"
                      strokeWidth={3}
                    >
                      {winLossData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-pos" />
                  <span className="text-soft">Wins</span>
                  <span className="font-mono">{stats.wins}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-neg" />
                  <span className="text-soft">Losses</span>
                  <span className="font-mono">{stats.losses}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 surface-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
                  Recent trades
                </div>
                <Link to="/trades" className="text-xs text-champagne hover:underline">
                  View all →
                </Link>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {trades.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={
                          "size-8 rounded-md flex items-center justify-center shrink-0 " +
                          (t.result === "win"
                            ? "bg-pos/10 text-pos"
                            : t.result === "loss"
                            ? "bg-neg/10 text-neg"
                            : "bg-accent text-soft")
                        }
                      >
                        <Activity className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {t.pair} <span className="text-soft uppercase text-xs">· {t.direction}</span>
                        </div>
                        <div className="text-xs text-faint truncate">
                          {new Date(t.trade_date).toLocaleDateString()} · {t.session ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={
                        "font-mono text-sm tabular-nums " +
                        ((t.pnl ?? 0) >= 0 ? "text-pos" : "text-neg")
                      }
                    >
                      {fmtMoney(t.pnl, { sign: true })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface-card-elevated top-accent p-10 md:p-16 text-center max-w-2xl mx-auto">
      <div className="size-12 rounded-xl bg-champagne/10 ring-1 ring-champagne/20 flex items-center justify-center mx-auto mb-5">
        <Sparkles className="size-5 text-champagne" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Your journal is empty.</h2>
      <p className="text-soft mt-2 max-w-md mx-auto">
        Log your first trade to start uncovering patterns in your performance and psychology.
      </p>
      <Link to="/trade/new" className="inline-block mt-6">
        <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11">
          <PlusCircle className="size-4" /> Log your first trade
        </Button>
      </Link>
    </div>
  );
}