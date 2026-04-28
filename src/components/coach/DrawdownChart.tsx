import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Trade } from "@/lib/trade-utils";
import { fmtMoney } from "@/lib/trade-utils";
import { drawdownSeries } from "@/lib/trader-coach";

export function DrawdownChart({ trades }: { trades: Trade[] }) {
  const data = drawdownSeries(trades);
  const maxDD = data.length ? Math.min(...data.map((d) => d.dd)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="surface-card p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-neg" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
              Drawdown Curve
            </span>
          </div>
          <div className="text-sm text-soft mt-1">Distance from equity peak</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-faint">Max DD</div>
          <div className="font-mono text-neg text-sm tabular-nums">
            {fmtMoney(maxDD, { sign: true })}
          </div>
        </div>
      </div>
      <div className="h-[220px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--neg)" stopOpacity={0} />
                <stop offset="100%" stopColor="var(--neg)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtMoney(v as number)}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v) => [fmtMoney(Number(v), { sign: true }), "Drawdown"]}
              labelFormatter={(l) => `Trade #${l}`}
            />
            <Area
              type="monotone"
              dataKey="dd"
              stroke="var(--neg)"
              strokeWidth={2}
              fill="url(#dd-grad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}