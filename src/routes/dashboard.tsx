import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useTrades } from "@/hooks/use-trades";
import { computeStats, fmtMoney, fmtPct } from "@/lib/trade-utils";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { TraderScoreCard } from "@/components/coach/TraderScoreCard";
import { MistakeAlerts } from "@/components/coach/MistakeAlerts";
import { computeTraderScore, detectMistakes } from "@/lib/trader-coach";
import { DailyInsightCard } from "@/components/coach/DailyInsightCard";
import { DisciplineScoreCard } from "@/components/behavioral/DisciplineScoreCard";
import { CooldownBanner } from "@/components/behavioral/CooldownBanner";
import { computeDisciplineScore } from "@/lib/behavior-tracking";
import { MentorCard } from "@/components/coach/MentorCard";
import { DailyMissions } from "@/components/coach/DailyMissions";
import { WinLossSplit } from "@/components/overview/WinLossSplit";
import { RecentTrades } from "@/components/overview/RecentTrades";
import { AICoachLastSession } from "@/components/coach/AICoachLastSession";
import { TodaySessionReview } from "@/components/overview/TodaySessionReview";
import { TraderIdentity } from "@/components/coach/TraderIdentity";
import { StreaksCard } from "@/components/coach/StreaksCard";
import { RuleViolationsBadge } from "@/components/rules/RuleViolationsBadge";
import { WeeklyReviewCard } from "@/components/weekly/WeeklyReviewCard";
import { MonthlyPnlCalendar } from "@/components/overview/MonthlyPnlCalendar";
import { TradingPlanCard } from "@/components/overview/TradingPlanCard";
import { useDemoMode } from "@/lib/demo-mode";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Vesper Journal" },
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
  const { demo, setDemo } = useDemoMode();
  const stats = useMemo(() => computeStats(trades), [trades]);
  const traderScore = useMemo(() => computeTraderScore(trades), [trades]);
  const mistakeAlerts = useMemo(() => detectMistakes(trades), [trades]);
  const discipline = useMemo(() => computeDisciplineScore(trades), [trades]);

  const empty = !loading && trades.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto"
    >
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
          <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11 shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--champagne)_50%,transparent)] hover:shadow-[0_0_40px_-4px_color-mix(in_oklab,var(--champagne)_60%,transparent)] transition-shadow">
            <PlusCircle className="size-4" /> Log a trade
          </Button>
        </Link>
      </header>

      {empty ? <EmptyState onDemo={() => setDemo(true)} /> : (
        <>
          {demo && (
            <div className="mb-6 rounded-lg border border-champagne/25 bg-champagne/5 px-4 py-3 text-xs text-champagne">
              This is sample data so you can see how Vesper looks once you've been journaling. Nothing here is yours yet.
            </div>
          )}
          <CooldownBanner />
          <DailyInsightCard trades={trades} />

          {/* HERO — Vesper Score + one insight + action */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
            <div className="lg:col-span-7">
              <TraderScoreCard score={traderScore} />
            </div>
            <div className="lg:col-span-5 lg:h-0 lg:min-h-full">
              <TradingPlanCard />
            </div>
          </section>

          {/* Identity + Streaks */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <TraderIdentity trades={trades} />
            <StreaksCard trades={trades} />
          </section>

          {/* PERFORMANCE */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-champagne rounded-full glow-champagne" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
                Performance
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Net P&L"
              tone={stats.totalPnl >= 0 ? "pos" : "neg"}
              value={
                <AnimatedNumber
                  value={stats.totalPnl}
                  format={(n) => fmtMoney(n, { sign: true })}
                />
              }
              sub={`${stats.closed} closed trades`}
            />
            <StatCard
              label="Win Rate"
              value={
                <AnimatedNumber value={stats.winRate} format={(n) => fmtPct(n)} />
              }
              sub={`${stats.wins}W · ${stats.losses}L`}
            />
            <StatCard
              label="Avg R:R"
              value={
                <AnimatedNumber value={stats.avgRR} format={(n) => n.toFixed(2)} />
              }
              sub="Risk multiple per trade"
            />
            <StatCard
              label="Expectancy"
              tone={stats.expectancy >= 0 ? "pos" : "neg"}
              value={
                <AnimatedNumber
                  value={stats.expectancy}
                  format={(n) => fmtMoney(n, { sign: true })}
                />
              }
              sub="Avg per trade"
            />
            </div>
          </section>

          {/* MONTHLY P&L CALENDAR */}
          <section className="mb-8">
            <MonthlyPnlCalendar trades={trades} />
          </section>

          {/* BEHAVIOR */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-champagne rounded-full glow-champagne" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
                Behavior
              </span>
            </div>
            <MentorCard trades={trades} />
            <div className="mb-4">
              <MistakeAlerts alerts={mistakeAlerts} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DisciplineScoreCard score={discipline} />
              <DailyMissions trades={trades} />
            </div>
          </section>

          {/* AI Coach — Last session */}
          <section className="mb-8">
            <AICoachLastSession trades={trades} />
          </section>

          {/* Today's Session Review */}
          <section className="mb-8">
            <TodaySessionReview trades={trades} />
          </section>

          {/* Rule Violations + Weekly Review */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <RuleViolationsBadge trades={trades} />
            <WeeklyReviewCard />
          </section>

          {/* SNAPSHOT — Win/Loss Split + Recent Trades */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
            <div className="lg:col-span-2">
              <WinLossSplit trades={trades} />
            </div>
            <div className="lg:col-span-3">
              <RecentTrades trades={trades} />
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="surface-card-elevated top-accent p-10 md:p-16 text-center max-w-2xl mx-auto">
      <div className="size-12 rounded-xl bg-champagne/10 ring-1 ring-champagne/20 flex items-center justify-center mx-auto mb-5">
        <Sparkles className="size-5 text-champagne" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Your journal is empty.</h2>
      <p className="text-soft mt-2 max-w-md mx-auto">
        Log your first trade to start uncovering patterns in your performance and psychology.
        Your Vesper Score, monthly P&amp;L calendar, session reviews and AI coaching all appear here
        once you have a few trades in.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/trade/new" className="inline-block">
          <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11 w-full">
            <PlusCircle className="size-4" /> Log your first trade
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={onDemo}
          className="gap-2 h-11 border-champagne/30 text-champagne hover:bg-champagne/10 hover:text-champagne"
        >
          <Eye className="size-4" /> See a demo with sample data
        </Button>
      </div>
      <p className="text-[11px] text-faint mt-4">
        Demo mode fills the app with example trades — you can exit it any time.
      </p>
    </div>
  );
}