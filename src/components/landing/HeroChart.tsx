import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/**
 * Decorative hero chart — a smoothly animated equity curve with gradient
 * fill, glow, and a moving "live" indicator dot.
 */
const SEED = [
  0, 120, 80, 240, 200, 380, 340, 520, 470, 690, 640, 880, 820, 1080, 1020,
  1280, 1200, 1480, 1410, 1700, 1620, 1920, 1840, 2180, 2080, 2440, 2360, 2680,
];

export function HeroChart() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 2200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = useMemo(() => {
    const n = Math.max(2, Math.floor(SEED.length * progress));
    return SEED.slice(0, n).map((v, i) => ({ i, v }));
  }, [progress]);

  return (
    <div className="relative w-full h-[320px] md:h-[420px]">
      {/* Glow halo */}
      <div className="absolute inset-0 bg-champagne/[0.06] blur-3xl rounded-full" />
      {/* Grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--champagne)" stopOpacity={0.55} />
              <stop offset="60%" stopColor="var(--champagne)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--champagne)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--champagne)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--champagne)" stopOpacity={1} />
            </linearGradient>
            <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, "dataMax + 200"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke="url(#heroStroke)"
            strokeWidth={2.5}
            fill="url(#heroFill)"
            filter="url(#heroGlow)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Floating stat chips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-4 left-4 surface-card-elevated px-3.5 py-2.5 backdrop-blur"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint">Net P&L</div>
        <div className="font-mono text-base text-pos tabular-nums">+$2,680.00</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-4 right-4 surface-card-elevated px-3.5 py-2.5 backdrop-blur"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint">Win rate</div>
        <div className="font-mono text-base tabular-nums">68.4%</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-4 left-4 surface-card-elevated px-3.5 py-2.5 backdrop-blur flex items-center gap-2"
      >
        <span className="size-1.5 rounded-full bg-pos glow-pos" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">Streak</div>
          <div className="font-mono text-sm text-pos">5 wins</div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-4 right-4 surface-card-elevated px-3.5 py-2.5 backdrop-blur"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint">Avg R:R</div>
        <div className="font-mono text-base text-champagne tabular-nums">2.34</div>
      </motion.div>
    </div>
  );
}