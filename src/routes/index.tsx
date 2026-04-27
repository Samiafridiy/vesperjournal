import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  BarChart3,
  Shield,
  Calendar,
  LineChart,
  Target,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { HeroChart } from "@/components/landing/HeroChart";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aegis — Trade smarter, not just more" },
      {
        name: "description",
        content:
          "A premium trading journal built around psychology and smart insights. Track every trade, log emotions and mistakes, and discover what's actually costing you.",
      },
      { property: "og:title", content: "Aegis — Trade smarter, not just more" },
      {
        property: "og:description",
        content: "Track psychology, surface insights, improve performance.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-40 w-[70vw] h-[70vw] bg-champagne/[0.06] rounded-full blur-[160px]"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[30%] -right-40 w-[60vw] h-[60vw] bg-pos/[0.04] rounded-full blur-[170px]"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-[20%] w-[55vw] h-[55vw] bg-champagne/[0.03] rounded-full blur-[180px]"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-30 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between"
      >
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
            <TrendingUp className="size-4 text-champagne" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Aegis</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-soft">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#analytics" className="hover:text-foreground transition-colors">Analytics</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-soft hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-champagne text-primary-foreground hover:bg-champagne/90">
              Get started
            </Button>
          </Link>
        </div>
      </motion.header>

      {/* HERO */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 max-w-6xl mx-auto px-6 pt-12 md:pt-20 pb-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface/60 backdrop-blur text-[11px] uppercase tracking-[0.18em] text-soft mb-8"
        >
          <span className="size-1.5 bg-champagne rounded-full glow-champagne" />
          The next-generation trading journal
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="text-balance text-4xl sm:text-5xl md:text-7xl lg:text-[88px] font-semibold tracking-tight leading-[1.02] max-w-4xl"
        >
          Trade smarter.
          <br />
          <span className="bg-gradient-to-r from-champagne via-champagne to-foreground bg-clip-text text-transparent">
            Not just more.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          className="mt-6 text-lg md:text-xl text-soft max-w-2xl text-pretty leading-relaxed"
        >
          A premium trading journal that tracks your psychology — not just your P&L.
          Aegis surfaces the emotions, sessions, and mistakes quietly draining your edge.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-12 px-6 text-base shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--champagne)_50%,transparent)] hover:shadow-[0_0_60px_-4px_color-mix(in_oklab,var(--champagne)_60%,transparent)] transition-shadow"
            >
              Start journaling free <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="border-border bg-surface/40 backdrop-blur h-12 px-6 text-base">
              Sign in
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-6 flex items-center gap-5 text-xs text-faint"
        >
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-pos" /> Free forever</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-pos" /> No credit card</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-pos" /> Encrypted & private</span>
        </motion.div>

        {/* Hero Chart */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          className="mt-20 surface-card-elevated top-accent p-3 md:p-5 relative"
        >
          <div className="rounded-xl bg-surface/60 border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-neg/60" />
                  <span className="size-2.5 rounded-full bg-champagne/60" />
                  <span className="size-2.5 rounded-full bg-pos/60" />
                </div>
                <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-faint">aegis · live equity</span>
              </div>
              <span className="font-mono text-[11px] text-soft">last 30 trades</span>
            </div>
            <div className="p-3">
              <HeroChart />
            </div>
          </div>
        </motion.div>

        {/* Logo strip / social proof */}
        <Reveal delay={0.2} className="mt-16 text-center">
          <div className="text-[10px] uppercase tracking-[0.22em] text-faint mb-5">Built for traders on</div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-soft text-sm font-medium">
            <span>MetaTrader 4</span>
            <span className="text-faint">·</span>
            <span>MetaTrader 5</span>
            <span className="text-faint">·</span>
            <span>cTrader</span>
            <span className="text-faint">·</span>
            <span>TradingView</span>
            <span className="text-faint">·</span>
            <span>Binance</span>
            <span className="text-faint">·</span>
            <span>Bybit</span>
          </div>
        </Reveal>
      </motion.section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <Reveal className="max-w-2xl mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">Features</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
            Everything in MyFXBook.<br />
            <span className="text-soft">Plus the things they forgot.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-4">
          <StaggerItem>
            <FeatureCard
              icon={Brain}
              title="Psychology tracking"
              body="Log emotions before and after each trade. Tag mistakes like FOMO and revenge. See what your mind does under pressure."
              tag="Unique"
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              icon={Sparkles}
              title="Smart insights"
              body="Aegis reads your journal and tells you the truth — your worst session, costliest mistake, the emotion that sabotages your edge."
              tag="AI-assisted"
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              icon={LineChart}
              title="Clean analytics"
              body="Equity curve, win rate, profit factor, expectancy, max drawdown. Auto-calculated. Updated in real time."
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              icon={Calendar}
              title="Calendar heatmap"
              body="See your green and red days at a glance. Spot your dangerous patterns — Mondays, post-loss revenge, late nights."
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              icon={Target}
              title="Auto R:R + P&L"
              body="Type entry, stop, lot. Aegis calculates pip value, R:R, and P&L instantly. No spreadsheets, no formulas."
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              icon={Zap}
              title="Lightning fast"
              body="Log a full trade in under 20 seconds. Built mobile-first. Realtime sync across devices via secure cloud."
            />
          </StaggerItem>
        </StaggerGroup>
      </section>

      {/* ANALYTICS PREVIEW */}
      <section id="analytics" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">The honest mirror</div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Insights you can't lie to yourself about.
            </h2>
            <p className="mt-5 text-soft text-pretty leading-relaxed text-lg">
              Most traders fail because they journal their wins and forget their losses.
              Aegis surfaces the patterns you'd rather not see — calmly, in plain language.
            </p>
            <ul className="mt-8 space-y-3.5">
              {[
                '"You lose 73% of trades entered with greed."',
                '"Your worst session is New York Fridays."',
                '"FOMO costs you $1,240 this month."',
                '"Trades held >4h are 2.1× more profitable."',
              ].map((q) => (
                <li key={q} className="flex items-start gap-3">
                  <Sparkles className="size-4 text-champagne mt-1 shrink-0" />
                  <span className="text-soft italic">{q}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="surface-card-elevated top-accent p-5 md:p-7 space-y-4">
              {[
                { tone: "warn", title: "You lose more in the New York session", detail: "−$840 over 12 trades. Consider sitting out or tightening rules." },
                { tone: "good", title: "London is your strongest session", detail: "+$1,420 across 18 trades. Lean into it." },
                { tone: "warn", title: "Most common mistake: FOMO", detail: "Tagged on 7 trades, costing −$520." },
                { tone: "good", title: "You perform best when Confident", detail: "+$1,680 from confident entries — your A-game state." },
              ].map((ins, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={
                    "rounded-lg p-4 border " +
                    (ins.tone === "warn"
                      ? "border-neg/20 bg-neg/10"
                      : "border-pos/20 bg-pos/10")
                  }
                >
                  <div className="text-sm font-medium">{ins.title}</div>
                  <div className="text-xs text-soft mt-1 leading-relaxed">{ins.detail}</div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">Pricing</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Free while we're in beta.
          </h2>
          <p className="mt-4 text-soft max-w-xl mx-auto">
            Aegis is in open beta. Every feature is unlocked. No credit card. No catch.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="surface-card-elevated top-accent p-8 md:p-10 max-w-md mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 size-60 bg-champagne/[0.08] rounded-full blur-3xl pointer-events-none" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-champagne mb-2">Beta access</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-tight">$0</span>
              <span className="text-soft">/forever during beta</span>
            </div>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "Unlimited trades & journals",
                "Psychology & mistake tracking",
                "Smart insights engine",
                "Calendar heatmap & analytics",
                "Realtime cross-device sync",
                "Encrypted, row-level security",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-pos shrink-0" />
                  <span className="text-soft">{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup" className="block mt-8">
              <Button size="lg" className="w-full bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-12">
                Claim free access <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <Reveal>
          <div className="surface-card-elevated top-accent p-10 md:p-16 text-center relative overflow-hidden">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 left-1/2 -translate-x-1/2 size-[150%] opacity-[0.04] pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, transparent, var(--champagne), transparent)",
              }}
            />
            <Shield className="size-6 text-champagne mx-auto mb-5 relative" />
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight relative">
              Stop guessing. Start improving.
            </h2>
            <p className="mt-4 text-soft text-lg max-w-xl mx-auto relative">
              Your next 100 trades will be your most honest yet.
            </p>
            <Link to="/signup" className="inline-block mt-8 relative">
              <Button
                size="lg"
                className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-12 px-8 text-base shadow-[0_0_50px_-8px_color-mix(in_oklab,var(--champagne)_55%,transparent)]"
              >
                Get started — it's free <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-faint">
          <span>© Aegis Journal · Built for traders</span>
          <span className="font-mono">SYS.READY</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  tag,
}: {
  icon: typeof TrendingUp;
  title: string;
  body: string;
  tag?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="surface-card p-7 hover:bg-surface-2 transition-colors group h-full relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {tag && (
        <span className="absolute top-5 right-5 text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-champagne/10 text-champagne border border-champagne/20">
          {tag}
        </span>
      )}
      <div className="size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/20 flex items-center justify-center mb-5 group-hover:glow-champagne group-hover:scale-110 transition-all duration-300">
        <Icon className="size-5 text-champagne" />
      </div>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-soft text-pretty leading-relaxed">{body}</p>
    </motion.div>
  );
}
