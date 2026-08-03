import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { computeDisciplineScore } from "@/lib/behavior-tracking";
import { cn } from "@/lib/utils";

type StreakItem = {
  id: string;
  label: string;
  count: number;
  brokeToday: boolean;
};

function dayKey(d: Date) {
  return d.toDateString();
}

export function computeStreaks(trades: Trade[]): StreakItem[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime(),
  );
  const today = new Date().toDateString();

  // Group by day (most recent first)
  const days: { key: string; date: Date; trades: Trade[] }[] = [];
  const seen = new Map<string, number>();
  for (const t of sorted) {
    const d = new Date(t.trade_date);
    const k = dayKey(d);
    if (!seen.has(k)) {
      seen.set(k, days.length);
      days.push({ key: k, date: d, trades: [] });
    }
    days[seen.get(k)!].trades.push(t);
  }

  // 1. Discipline days — consecutive days with discipline score >= 70 (rolling over all trades up to that day)
  let disciplineStreak = 0;
  let disciplineBroke = false;
  for (let i = 0; i < days.length; i++) {
    const cutoff = days[i].date.getTime();
    const upto = trades.filter((t) => new Date(t.trade_date).getTime() <= cutoff + 24 * 60 * 60 * 1000);
    const score = computeDisciplineScore(upto).score;
    if (score >= 70) disciplineStreak++;
    else {
      if (i === 0 && days[i].key === today) disciplineBroke = true;
      break;
    }
  }

  // 2. Clean sessions — consecutive days with no violations (no revenge, no overtrading, no missing SL)
  let cleanStreak = 0;
  let cleanBroke = false;
  for (let i = 0; i < days.length; i++) {
    const day = days[i].trades.sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
    );
    let bad = false;
    if (day.length > 3) bad = true;
    if (day.some((t) => t.stop_loss == null)) bad = true;
    for (let j = 1; j < day.length; j++) {
      if (day[j - 1].result === "loss") {
        const gap = new Date(day[j].trade_date).getTime() - new Date(day[j - 1].trade_date).getTime();
        if (gap >= 0 && gap <= 30 * 60 * 1000) bad = true;
      }
    }
    if (!bad) cleanStreak++;
    else {
      if (i === 0 && days[i].key === today) cleanBroke = true;
      break;
    }
  }

  // 3. SL on every trade — consecutive trades (chronological from newest) with SL set
  let slStreak = 0;
  let slBroke = false;
  for (const t of sorted) {
    if (t.stop_loss != null) slStreak++;
    else {
      if (slStreak === 0 && new Date(t.trade_date).toDateString() === today) slBroke = true;
      break;
    }
  }

  // 4. No revenge trades — consecutive sessions with no revenge pattern detected
  let noRevengeStreak = 0;
  let revengeBroke = false;
  for (let i = 0; i < days.length; i++) {
    const day = days[i].trades.sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
    );
    let revenge = false;
    for (let j = 1; j < day.length; j++) {
      if (day[j - 1].result === "loss") {
        const gap = new Date(day[j].trade_date).getTime() - new Date(day[j - 1].trade_date).getTime();
        if (gap >= 0 && gap <= 30 * 60 * 1000) revenge = true;
      }
    }
    if (!revenge) noRevengeStreak++;
    else {
      if (i === 0 && days[i].key === today) revengeBroke = true;
      break;
    }
  }

  return [
    { id: "discipline", label: "Discipline days", count: disciplineStreak, brokeToday: disciplineBroke },
    { id: "clean", label: "Clean sessions", count: cleanStreak, brokeToday: cleanBroke },
    { id: "sl", label: "SL on every trade", count: slStreak, brokeToday: slBroke },
    { id: "no-revenge", label: "No revenge trades", count: noRevengeStreak, brokeToday: revengeBroke },
  ];
}

function numberColor(n: number) {
  if (n >= 7) return "text-pos drop-shadow-[0_0_8px_color-mix(in_oklab,var(--pos)_50%,transparent)]";
  if (n >= 3) return "text-champagne";
  return "text-champagne/60";
}

export function StreaksCard({ trades }: { trades: Trade[] }) {
  const streaks = useMemo(() => computeStreaks(trades), [trades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="surface-card p-6 flex flex-col gap-4 hover-glow hover-glow-champagne"
    >
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Streaks
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {streaks.map((s) => (
          <div
            key={s.id}
            className="relative rounded-lg bg-surface/70 border border-border/60 px-3 py-3 flex flex-col gap-1 hover-glow hover-glow-champagne"
          >
            {s.brokeToday && (
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-neg" />
            )}
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-[24px] font-medium font-mono tabular-nums leading-none", numberColor(s.count))}>
                {s.count}
              </span>
              {s.count >= 7 && <span className="text-sm leading-none">🔥</span>}
            </div>
            <span className="text-[11px] text-faint">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}