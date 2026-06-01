import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import type { PsychMatrix } from "@/lib/behavioral-intel";
import { fmtMoney } from "@/lib/trade-utils";

export function PsychPnlMatrix({ matrix }: { matrix: PsychMatrix }) {
  const { cells, size, maxAbs, flowZone, dangerZone, total } = matrix;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface-card p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="size-3.5 text-champagne" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
              Psychology × P&amp;L Matrix
            </div>
          </div>
          <div className="text-sm text-soft mt-1">
            How your mental state shapes your results
          </div>
        </div>
        <div className="text-[11px] font-mono text-faint">{total} mapped</div>
      </div>

      {total < 3 ? (
        <div className="text-sm text-soft py-8 text-center">
          Tag emotions on your trades to unlock the matrix.
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.18em] text-faint -rotate-90 whitespace-nowrap">
              Stress →
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
              {/* Render rows top-down: highest stress on top */}
              {Array.from({ length: size }).map((_, rowIdx) => {
                const y = size - 1 - rowIdx;
                return Array.from({ length: size }).map((__, x) => {
                  const c = cells.find((cell) => cell.x === x && cell.y === y)!;
                  const intensity = Math.min(1, Math.abs(c.pnl) / maxAbs);
                  const isPos = c.pnl > 0;
                  const isNeg = c.pnl < 0;
                  const isFlow = flowZone && flowZone.x === x && flowZone.y === y;
                  const isDanger = dangerZone && dangerZone.x === x && dangerZone.y === y;
                  const bg =
                    c.count === 0
                      ? "var(--surface-2)"
                      : isPos
                      ? `color-mix(in oklab, var(--pos) ${15 + intensity * 70}%, transparent)`
                      : isNeg
                      ? `color-mix(in oklab, var(--neg) ${15 + intensity * 70}%, transparent)`
                      : "var(--surface-2)";
                  return (
                    <div
                      key={`${x}-${y}`}
                      title={
                        c.count === 0
                          ? "No trades"
                          : `Confidence ${x * 2 + 1}-${x * 2 + 2} · Stress ${y * 2 + 1}-${y * 2 + 2}\n${c.count} trade${c.count === 1 ? "" : "s"} · ${fmtMoney(c.pnl, { sign: true })}`
                      }
                      className="relative aspect-square rounded-md border border-border/60 flex items-center justify-center text-[10px] font-mono tabular-nums transition-transform hover:scale-110 hover:z-10"
                      style={{
                        background: bg,
                        boxShadow: isFlow
                          ? "0 0 0 1.5px var(--pos), 0 0 18px -4px color-mix(in oklab, var(--pos) 60%, transparent)"
                          : isDanger
                          ? "0 0 0 1.5px var(--neg), 0 0 18px -4px color-mix(in oklab, var(--neg) 60%, transparent)"
                          : undefined,
                      }}
                    >
                      {c.count > 0 && (
                        <span className="text-[10px] text-foreground/80 leading-none">
                          {c.count}
                        </span>
                      )}
                    </div>
                  );
                });
              })}
            </div>
            <div className="text-center text-[10px] uppercase tracking-[0.18em] text-faint mt-1">
              Confidence →
            </div>
          </div>
        </div>
      )}

      {(flowZone || dangerZone) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 pt-4 border-t border-border">
          {flowZone && (
            <div className="rounded-md border border-pos/30 bg-pos/[0.08] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-pos font-medium">
                Flow Zone
              </div>
              <div className="text-xs text-soft mt-0.5">
                Confidence {flowZone.x * 2 + 1}-{flowZone.x * 2 + 2} · Stress {flowZone.y * 2 + 1}-{flowZone.y * 2 + 2} ·{" "}
                <span className="text-pos font-mono">{fmtMoney(flowZone.pnl, { sign: true })}</span>
              </div>
            </div>
          )}
          {dangerZone && (
            <div className="rounded-md border border-neg/30 bg-neg/[0.08] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-neg font-medium">
                Danger Zone
              </div>
              <div className="text-xs text-soft mt-0.5">
                Confidence {dangerZone.x * 2 + 1}-{dangerZone.x * 2 + 2} · Stress {dangerZone.y * 2 + 1}-{dangerZone.y * 2 + 2} ·{" "}
                <span className="text-neg font-mono">{fmtMoney(dangerZone.pnl, { sign: true })}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}