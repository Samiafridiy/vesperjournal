import { motion } from "framer-motion";
import { Check, X, Target, Circle } from "lucide-react";
import { useMemo } from "react";
import type { Trade } from "@/lib/trade-utils";
import { cn } from "@/lib/utils";

type MissionStatus = "pending" | "done" | "failed";
type Mission = {
  id: string;
  text: string;
  progress: string;
  status: MissionStatus;
};

function computeMissions(trades: Trade[]): Mission[] {
  const today = new Date().toDateString();
  const todays = trades
    .filter((t) => new Date(t.trade_date).toDateString() === today)
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // 1. Max 3 trades today
  const tradeCount = todays.length;
  const maxTradesStatus: MissionStatus =
    tradeCount === 0 ? "pending" : tradeCount > 3 ? "failed" : tradeCount === 3 ? "done" : "pending";

  // 2. Stop loss on every trade
  const withSL = todays.filter((t) => t.stop_loss != null).length;
  const slStatus: MissionStatus =
    todays.length === 0
      ? "pending"
      : withSL === todays.length
      ? "done"
      : "failed";

  // 3. No trades within 20 min of a loss
  let revenge = false;
  for (let i = 1; i < todays.length; i++) {
    const prev = todays[i - 1];
    if (prev.result !== "loss") continue;
    const gap = new Date(todays[i].trade_date).getTime() - new Date(prev.trade_date).getTime();
    if (gap >= 0 && gap <= 20 * 60 * 1000) {
      revenge = true;
      break;
    }
  }
  const cooldownStatus: MissionStatus =
    todays.length === 0 ? "pending" : revenge ? "failed" : "done";

  return [
    {
      id: "max-trades",
      text: "Max 3 trades today",
      progress: `${Math.min(tradeCount, 3)}/3`,
      status: maxTradesStatus,
    },
    {
      id: "stop-loss",
      text: "Use stop loss on every trade",
      progress: `${withSL}/${todays.length || 0}`,
      status: slStatus,
    },
    {
      id: "cooldown",
      text: "No trades within 20 min of a loss",
      progress: revenge ? "0/1" : "1/1",
      status: cooldownStatus,
    },
  ];
}

function StatusIcon({ status }: { status: MissionStatus }) {
  if (status === "done") {
    return (
      <div className="size-6 rounded-full bg-pos/15 ring-1 ring-pos/30 flex items-center justify-center shrink-0">
        <Check className="size-3.5 text-pos" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="size-6 rounded-full bg-neg/15 ring-1 ring-neg/30 flex items-center justify-center shrink-0">
        <X className="size-3.5 text-neg" />
      </div>
    );
  }
  return (
    <div className="size-6 rounded-full ring-1 ring-border flex items-center justify-center shrink-0">
      <Circle className="size-2.5 text-faint" />
    </div>
  );
}

export function DailyMissions({ trades }: { trades: Trade[] }) {
  const missions = useMemo(() => computeMissions(trades), [trades]);
  const doneCount = missions.filter((m) => m.status === "done").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="surface-card p-6 flex flex-col gap-4 h-full hover-glow hover-glow-champagne"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
            Daily Missions
          </span>
          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-champagne/20 text-champagne">
            New
          </span>
        </div>
        <span className="text-[10px] text-faint font-mono">{doneCount}/{missions.length}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {missions.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            className={cn(
              "rounded-lg p-3 border flex items-center gap-3",
              m.status === "done"
                ? "border-pos/20 bg-pos/5"
                : m.status === "failed"
                ? "border-neg/25 bg-neg/5"
                : "border-border bg-surface",
            )}
          >
            <StatusIcon status={m.status} />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm",
                  m.status === "done"
                    ? "text-foreground/70 line-through decoration-pos/40"
                    : "text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-mono shrink-0",
                m.status === "done"
                  ? "text-pos"
                  : m.status === "failed"
                  ? "text-neg"
                  : "text-faint",
              )}
            >
              {m.progress}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}