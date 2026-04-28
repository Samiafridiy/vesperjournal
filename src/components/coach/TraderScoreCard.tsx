import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import type { TraderScore } from "@/lib/trader-coach";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { cn } from "@/lib/utils";

export function TraderScoreCard({ score }: { score: TraderScore }) {
  const toneClass =
    score.color === "pos" ? "text-pos" : score.color === "warn" ? "text-champagne" : "text-neg";
  const ringColor =
    score.color === "pos" ? "var(--pos)" : score.color === "warn" ? "var(--champagne)" : "var(--neg)";
  const tierLabel =
    score.tier === "strong" ? "Strong" : score.tier === "average" ? "Average" : "Needs work";

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface-card-elevated top-accent p-6 flex flex-col gap-5 relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 size-52 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: ringColor }}
      />
      <div className="flex items-center gap-2 relative">
        <Sparkles className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          AI Trader Score
        </span>
      </div>

      <div className="flex items-center gap-6 relative">
        <div className="relative size-[128px] shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              stroke="var(--border)"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              stroke={ringColor}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: `drop-shadow(0 0 10px ${ringColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={cn("font-mono text-4xl font-semibold tabular-nums leading-none", toneClass)}>
              <AnimatedNumber value={score.score} format={(n) => Math.round(n).toString()} />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-faint mt-1">/ 100</div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cn("text-lg font-semibold", toneClass)}>{tierLabel}</div>
          <div className="text-xs text-soft mt-1 leading-relaxed">
            {score.breakdown.length === 0
              ? "Log a few more trades to unlock your score."
              : "Composite of discipline, risk, and psychology signals."}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {score.breakdown.length > 0 && (
        <div className="flex flex-col gap-2.5 relative">
          {score.breakdown.map((b, i) => (
            <motion.div
              key={b.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-3 text-xs"
            >
              <div className="w-28 truncate text-soft">{b.label}</div>
              <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.score}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      b.score >= 70 ? "var(--pos)" : b.score >= 40 ? "var(--champagne)" : "var(--neg)",
                  }}
                />
              </div>
              <div className="font-mono w-8 text-right tabular-nums text-faint">
                {Math.round(b.score)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <div className="border-t border-border pt-4 flex flex-col gap-2 relative">
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint font-medium flex items-center gap-1.5">
            <TrendingUp className="size-3" /> How to improve
          </div>
          {score.suggestions.map((s, i) => (
            <div key={i} className="text-xs text-soft leading-relaxed flex gap-2">
              <span className="text-champagne">→</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}