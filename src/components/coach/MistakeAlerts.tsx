import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { MistakeAlert } from "@/lib/trader-coach";
import { cn } from "@/lib/utils";

export function MistakeAlerts({ alerts }: { alerts: MistakeAlert[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="surface-card p-6 flex flex-col gap-4 h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-neg" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-neg font-medium">
            Mistake Alerts
          </span>
        </div>
        <span className="text-[10px] text-faint font-mono">{alerts.length} active</span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-pos/20 bg-pos/5 p-4">
          <ShieldCheck className="size-5 text-pos shrink-0" />
          <div>
            <div className="text-sm font-medium text-pos">Clean record</div>
            <div className="text-xs text-soft mt-0.5">No behavioral flags detected.</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {alerts.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className={cn(
                "rounded-lg p-4 border hover-glow",
                a.severity === "high"
                  ? "border-neg/30 bg-neg/10 hover-glow-neg"
                  : "border-champagne/25 bg-champagne/5 hover-glow-champagne",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "size-8 rounded-md flex items-center justify-center shrink-0",
                    a.severity === "high" ? "bg-neg/15 text-neg" : "bg-champagne/15 text-champagne",
                  )}
                >
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">{a.title}</div>
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded",
                        a.severity === "high"
                          ? "bg-neg/20 text-neg"
                          : "bg-champagne/20 text-champagne",
                      )}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <div className="text-xs text-soft mt-1">{a.detail}</div>
                  <div className="text-xs mt-2 flex items-start gap-1.5">
                    <span className="text-champagne">Fix:</span>
                    <span className="text-foreground/80">{a.fix}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}