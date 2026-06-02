import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { DisciplineScore } from "@/lib/behavior-tracking";
import { cn } from "@/lib/utils";

export function DisciplineScoreCard({ score }: { score: DisciplineScore }) {
  const tone =
    score.tier === "strong" ? "text-pos" : score.tier === "average" ? "text-champagne" : "text-neg";
  const ring =
    score.tier === "strong" ? "var(--pos)" : score.tier === "average" ? "var(--champagne)" : "var(--neg)";
  const tierLabel =
    score.tier === "strong" ? "Disciplined" : score.tier === "average" ? "Building" : "Needs work";

  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface-card p-5 flex flex-col gap-4 relative overflow-hidden"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
          Discipline Score
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-[80px] shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r="32" stroke="var(--border)" strokeWidth="6" fill="none" />
            <motion.circle
              cx="40"
              cy="40"
              r="32"
              stroke={ring}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: `drop-shadow(0 0 6px ${ring})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-mono text-2xl font-semibold tabular-nums", tone)}>
              {score.sample === 0 ? "—" : score.score}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-base font-semibold", tone)}>{tierLabel}</div>
          <div className="text-xs text-soft mt-1 leading-relaxed">
            {score.sample === 0
              ? "Log trades with behavior tags to build your score."
              : `Based on your last ${score.sample} trade${score.sample === 1 ? "" : "s"}.`}
          </div>
        </div>
      </div>

      {score.breakdown.length > 0 && (
        <div className="flex flex-col gap-2">
          {score.breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <div className="w-28 truncate text-soft">{b.label}</div>
              <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${b.score}%`,
                    background:
                      b.score >= 70 ? "var(--pos)" : b.score >= 40 ? "var(--champagne)" : "var(--neg)",
                  }}
                />
              </div>
              <div className="font-mono w-8 text-right tabular-nums text-faint">{b.score}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}