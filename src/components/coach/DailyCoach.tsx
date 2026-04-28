import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import type { CoachMessage } from "@/lib/trader-coach";
import { cn } from "@/lib/utils";

export function DailyCoach({ messages }: { messages: CoachMessage[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="surface-card p-6 flex flex-col gap-4 h-full"
    >
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Daily Trading Coach
        </span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className={cn(
              "rounded-lg p-3.5 border flex gap-3",
              m.tone === "warn" && "border-neg/25 bg-neg/5",
              m.tone === "good" && "border-pos/25 bg-pos/5",
              m.tone === "neutral" && "border-border bg-surface-2/40",
            )}
          >
            <div
              className={cn(
                "size-1.5 rounded-full mt-2 shrink-0",
                m.tone === "warn" && "bg-neg",
                m.tone === "good" && "bg-pos",
                m.tone === "neutral" && "bg-muted-foreground",
              )}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">{m.title}</div>
              <div className="text-xs text-soft mt-1 leading-relaxed">{m.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}