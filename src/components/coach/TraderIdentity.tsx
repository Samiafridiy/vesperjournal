import { useMemo } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Flame, AlertTriangle, ShieldCheck, TrendingUp, Activity, Repeat } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { computeDisciplineScore } from "@/lib/behavior-tracking";
import { cn } from "@/lib/utils";

type Tone = "neg" | "warn" | "pos";
type Identity = {
  name: string;
  label: string;
  tone: Tone;
  description: string;
  fix: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const EMOTIONAL = new Set(["Anxious", "Greed", "Fear", "Revenge"]);
const DAILY_LIMIT = 3;

function computeIdentity(trades: Trade[]): Identity {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const last7 = trades
    .filter((t) => now - new Date(t.trade_date).getTime() <= weekMs)
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // Group by day
  const byDay = new Map<string, Trade[]>();
  for (const t of last7) {
    const d = new Date(t.trade_date).toDateString();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(t);
  }

  // Revenge: trades entered within 30 min of a prior loss (same day)
  let revengeCount = 0;
  for (const day of byDay.values()) {
    for (let i = 1; i < day.length; i++) {
      const prev = day[i - 1];
      if (prev.result !== "loss") continue;
      const gap = new Date(day[i].trade_date).getTime() - new Date(prev.trade_date).getTime();
      if (gap >= 0 && gap <= 30 * 60 * 1000) revengeCount++;
    }
  }
  const revengePct = last7.length ? revengeCount / last7.length : 0;

  // Overtrader: days exceeding daily limit
  let overDays = 0;
  for (const day of byDay.values()) if (day.length > DAILY_LIMIT) overDays++;

  // Emotional trades
  const emotionalCount = last7.filter((t) => EMOTIONAL.has(t.emotion_before ?? "")).length;
  const emotionalPct = last7.length ? emotionalCount / last7.length : 0;

  // Plan adherence
  const planTagged = last7.filter((t) => (t as Trade & { followed_plan?: boolean | null }).followed_plan != null);
  const followed = planTagged.filter((t) => (t as Trade & { followed_plan?: boolean | null }).followed_plan === true).length;
  const planPct = planTagged.length ? followed / planTagged.length : 1;

  // Discipline score current vs first half of week
  const discipline = computeDisciplineScore(trades);
  const halfTrades = trades.filter((t) => {
    const age = now - new Date(t.trade_date).getTime();
    return age > weekMs / 2 && age <= weekMs;
  });
  const olderDiscipline = computeDisciplineScore(halfTrades);
  const improving = discipline.score > olderDiscipline.score;

  if (revengePct > 0.2) {
    return {
      name: "Revenge Trader",
      label: "Behavior Pattern",
      tone: "neg",
      description:
        "You're re-entering the market too soon after losses. This emotional reaction usually compounds losses rather than recovering them.",
      fix: "After any loss, wait 30 minutes before your next trade. No exceptions.",
      Icon: Repeat,
    };
  }
  if (overDays > 3) {
    return {
      name: "Overtrader",
      label: "Behavior Pattern",
      tone: "neg",
      description:
        "You're taking more trades per day than your edge supports. Quantity is diluting the quality of your setups.",
      fix: "Set your daily limit to 3 trades and stop when you hit it.",
      Icon: Activity,
    };
  }
  if (emotionalPct > 0.4) {
    return {
      name: "Emotional Trader",
      label: "Behavior Pattern",
      tone: "neg",
      description:
        "Most of your trades are entered in a heightened emotional state. Your decisions are reactive, not strategic.",
      fix: "Only trade when you mark yourself as Calm or Confident.",
      Icon: AlertTriangle,
    };
  }
  if (planTagged.length > 0 && planPct < 0.5) {
    return {
      name: "Inconsistent Trader",
      label: "Behavior Pattern",
      tone: "warn",
      description:
        "Less than half of your trades followed your plan. You have rules — you're just not applying them.",
      fix: "Before every trade, ask yourself: is this in my plan? If no — skip it.",
      Icon: AlertTriangle,
    };
  }
  if (improving && discipline.score < 70) {
    return {
      name: "Building Discipline",
      label: "Progress",
      tone: "warn",
      description:
        "Your discipline score is climbing this week. You're moving in the right direction — keep reinforcing the habits.",
      fix: "You are improving. Focus on stop loss usage — it's your lowest score.",
      Icon: TrendingUp,
    };
  }
  return {
    name: "Disciplined Trader",
    label: "Identity",
    tone: "pos",
    description:
      "You're following your rules and trading from a stable place. Consistency is the foundation of every profitable career.",
    fix: "Keep it up. Your edge is consistency — protect it.",
    Icon: ShieldCheck,
  };
}

const toneStyles: Record<Tone, { iconBox: string; iconColor: string; label: string }> = {
  neg: {
    iconBox: "bg-neg/15 ring-1 ring-neg/30",
    iconColor: "text-neg",
    label: "text-neg",
  },
  warn: {
    iconBox: "bg-champagne/15 ring-1 ring-champagne/30",
    iconColor: "text-champagne",
    label: "text-champagne",
  },
  pos: {
    iconBox: "bg-pos/15 ring-1 ring-pos/30",
    iconColor: "text-pos",
    label: "text-pos",
  },
};

export function TraderIdentity({ trades }: { trades: Trade[] }) {
  const identity = useMemo(() => computeIdentity(trades), [trades]);
  const styles = toneStyles[identity.tone];
  const { Icon } = identity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={cn(
        "surface-card p-6 flex flex-col gap-4 hover-glow",
        identity.tone === "pos" && "hover-glow-pos",
        identity.tone === "warn" && "hover-glow-champagne",
        identity.tone === "neg" && "hover-glow-neg",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
            This Week's Identity
          </span>
        </div>
        <span className="text-[10px] text-faint">Updated every 7 days</span>
      </div>

      <div className="flex items-start gap-4">
        <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", styles.iconBox)}>
          <Icon className={cn("size-5", styles.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-[10px] uppercase tracking-[0.16em] font-medium mb-1", styles.label)}>
            {identity.label}
          </div>
          <div className="text-[18px] font-medium leading-tight">{identity.name}</div>
        </div>
      </div>

      <p className="text-xs text-soft leading-relaxed">{identity.description}</p>

      <div className="rounded-md bg-surface/60 border-l-2 border-pos px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.16em] text-pos font-medium mb-1">
          This week's fix:
        </div>
        <div className="text-xs text-foreground/90 leading-relaxed">{identity.fix}</div>
      </div>
    </motion.div>
  );
}