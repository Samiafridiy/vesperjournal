import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Trade } from "@/lib/trade-utils";
import { computeStats, fmtMoney, fmtPct } from "@/lib/trade-utils";
import { useAuth } from "@/lib/auth";

function dismissKey(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `vesper.coach-says.${uid}.${day}`;
}

/**
 * Generates a deterministic "tip of the day" from real trade stats. Different
 * day-of-year picks a different angle so the user sees fresh insight each day.
 */
function buildDailyInsight(trades: Trade[]): { title: string; body: string } | null {
  const closed = trades.filter((t) => t.pnl != null);
  if (closed.length === 0) return null;
  const stats = computeStats(trades);

  const day = Math.floor(Date.now() / 86_400_000);

  // Best/worst session
  const bySession: Record<string, { pnl: number; n: number; w: number }> = {};
  for (const t of closed) {
    if (!t.session) continue;
    const e = (bySession[t.session] ??= { pnl: 0, n: 0, w: 0 });
    e.pnl += t.pnl ?? 0; e.n += 1; if (t.result === "win") e.w += 1;
  }
  const sessions = Object.entries(bySession);
  const worstSession = sessions.sort((a, b) => a[1].pnl - b[1].pnl)[0];
  const bestSession = sessions.sort((a, b) => b[1].pnl - a[1].pnl)[0];

  // Best/worst pair
  const byPair: Record<string, { pnl: number; n: number; w: number }> = {};
  for (const t of closed) {
    const e = (byPair[t.pair] ??= { pnl: 0, n: 0, w: 0 });
    e.pnl += t.pnl ?? 0; e.n += 1; if (t.result === "win") e.w += 1;
  }
  const pairs = Object.entries(byPair);
  const bestPair = pairs.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const worstPair = pairs.sort((a, b) => a[1].pnl - b[1].pnl)[0];

  // Mistakes
  const mistakeCount: Record<string, { n: number; pnl: number }> = {};
  for (const t of closed) for (const m of t.mistakes ?? []) {
    const e = (mistakeCount[m] ??= { n: 0, pnl: 0 });
    e.n += 1; e.pnl += t.pnl ?? 0;
  }
  const topMistake = Object.entries(mistakeCount).sort((a, b) => b[1].n - a[1].n)[0];

  // Pool of insights from real data only
  const pool: { title: string; body: string }[] = [];

  if (worstSession && worstSession[1].pnl < 0 && worstSession[1].n >= 3) {
    const wr = (worstSession[1].w / worstSession[1].n) * 100;
    pool.push({
      title: `${worstSession[0]} session is leaking money`,
      body: `${fmtMoney(worstSession[1].pnl, { sign: true })} across ${worstSession[1].n} trades, ${fmtPct(wr)} win rate. Skip or tighten rules today.`,
    });
  }
  if (bestSession && bestSession[1].pnl > 0 && bestSession[1].n >= 3) {
    pool.push({
      title: `${bestSession[0]} is your strongest session`,
      body: `${fmtMoney(bestSession[1].pnl, { sign: true })} on ${bestSession[1].n} trades. Lean into setups during this window.`,
    });
  }
  if (topMistake && topMistake[1].n >= 2) {
    pool.push({
      title: `Recurring mistake: ${topMistake[0]}`,
      body: `Tagged on ${topMistake[1].n} trades costing ${fmtMoney(topMistake[1].pnl, { sign: true })}. Make this your one rule today.`,
    });
  }
  if (bestPair && bestPair[1].pnl > 0 && bestPair[1].n >= 3) {
    pool.push({
      title: `Best performer: ${bestPair[0]}`,
      body: `${fmtMoney(bestPair[1].pnl, { sign: true })} over ${bestPair[1].n} trades. Trust your edge here.`,
    });
  }
  if (worstPair && worstPair[1].pnl < 0 && worstPair[1].n >= 3 && worstPair[0] !== bestPair?.[0]) {
    pool.push({
      title: `${worstPair[0]} is your worst pair`,
      body: `${fmtMoney(worstPair[1].pnl, { sign: true })} over ${worstPair[1].n} trades. Consider removing it from your watchlist.`,
    });
  }
  if (stats.streakType === "loss" && stats.streak >= 2) {
    pool.push({
      title: `${stats.streak}-trade losing streak`,
      body: `Reduce size by half on the next entry until you break the streak. Don't revenge trade.`,
    });
  }
  if (stats.streakType === "win" && stats.streak >= 3) {
    pool.push({
      title: `${stats.streak} wins in a row — stay disciplined`,
      body: `This is when overconfidence creeps in. Keep your normal risk %, don't size up impulsively.`,
    });
  }
  if (stats.profitFactor > 0 && stats.profitFactor < 1 && stats.closed >= 5) {
    pool.push({
      title: `Profit factor below 1: ${stats.profitFactor.toFixed(2)}`,
      body: `You're paying out more than you take in. Focus on R:R — only take setups offering 2R+ today.`,
    });
  }
  if (stats.avgRR < 1 && stats.closed >= 5) {
    pool.push({
      title: `Avg R:R only ${stats.avgRR.toFixed(2)}`,
      body: `You're cutting winners early. Pre-set your TP and don't move it. Let the math work.`,
    });
  }

  if (pool.length === 0) {
    return {
      title: "Keep journaling",
      body: `${stats.closed} closed trades so far at ${fmtPct(stats.winRate)} win rate. Patterns emerge past 10 — log every trade.`,
    };
  }
  return pool[day % pool.length];
}

export function CoachSaysToday({ trades }: { trades: Trade[] }) {
  const { user } = useAuth();
  const insight = useMemo(() => buildDailyInsight(trades), [trades]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && localStorage.getItem(dismissKey(user.id)) === "1") {
      setDismissed(true);
    }
  }, [user]);

  function dismiss() {
    if (user) localStorage.setItem(dismissKey(user.id), "1");
    setDismissed(true);
  }

  if (dismissed || !insight) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="surface-card-elevated top-accent p-5 mb-6 relative overflow-hidden"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-faint hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
            <Brain className="size-4 text-champagne" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
                Coach says today
              </span>
            </div>
            <div className="text-sm font-semibold text-foreground">{insight.title}</div>
            <div className="text-sm text-soft mt-1 leading-relaxed">{insight.body}</div>
            <Link
              to="/coach"
              className="inline-flex items-center gap-1.5 text-xs text-champagne hover:underline mt-3"
            >
              <MessageSquare className="size-3.5" /> Continue with Vesper →
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}