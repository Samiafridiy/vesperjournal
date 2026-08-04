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
  CheckCircle2,
  Check,
  MessageSquare,
  AlertTriangle,
  Target,
  Activity,
  Gauge,
  Trophy,
  Building2,
  User,
  Send,
  Flame,
  Eye,
  ChevronRight,
  Quote,
  Twitter,
} from "lucide-react";
import { HeroCalendarPreview } from "@/components/landing/HeroCalendarPreview";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vesper Journal — Trade smarter, not just more" },
      {
        name: "description",
        content:
          "AI-powered trading journal that scores your discipline, catches your mistakes, and tells you exactly what's costing you money. Free during beta.",
      },
      { property: "og:title", content: "Vesper Journal — Trade smarter, not just more" },
      {
        property: "og:description",
        content: "AI Trader Score, live coach, mistake alerts, and risk engine — built for funded, live, and learning traders.",
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
          <span className="text-sm font-semibold tracking-tight">Vesper Journal</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-soft">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#built-for" className="hover:text-foreground transition-colors">Who it's for</a>
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
        className="relative z-10 max-w-6xl mx-auto px-6 pt-12 md:pt-20 pb-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface/60 backdrop-blur text-[11px] uppercase tracking-[0.18em] text-soft mb-8"
        >
          <span className="size-1.5 bg-champagne rounded-full glow-champagne" />
          The AI trading journal
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
          Vesper scores your discipline, catches your mistakes in real time, and tells you exactly what's costing you money — using your own trade data.
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

        {/* Hero preview card with stats */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          className="mt-16 surface-card-elevated top-accent p-3 md:p-5 relative"
        >
          <div className="rounded-xl bg-surface/60 border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-neg/60" />
                  <span className="size-2.5 rounded-full bg-champagne/60" />
                  <span className="size-2.5 rounded-full bg-pos/60" />
                </div>
                <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-faint">vesper · live dashboard</span>
              </div>
              <span className="font-mono text-[11px] text-soft">last 30 trades</span>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60">
              <HeroStat label="AI Trader Score" value="67" suffix="/100" tone="champagne" />
              <HeroStat label="Win Rate" value="58" suffix="%" tone="pos" />
              <HeroStat label="Trades" value="124" tone="default" />
              <HeroStat label="Max Drawdown" value="-$180" tone="neg" />
            </div>

            <HeroCalendarPreview />
          </div>
        </motion.div>
      </motion.section>

      {/* SOCIAL PROOF BAR */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <Reveal>
          <div className="surface-card top-accent px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { v: "325+", l: "trades analyzed" },
              { v: "Free", l: "during beta" },
              { v: "Built for", l: "every trader" },
              { v: "0", l: "credit card required" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col items-center">
                <div className="text-xl md:text-2xl font-semibold tracking-tight text-champagne tabular">{s.v}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-faint mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* PROBLEM STATEMENT */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <Reveal>
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">The hard truth</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-balance">
            You know <span className="text-soft">HOW</span> to trade.<br />
            So why are you still <span className="text-neg">losing?</span>
          </h2>
          <p className="mt-6 text-soft text-pretty leading-relaxed text-lg max-w-2xl mx-auto">
            Most traders lose not because of strategy — but because of patterns they can't see.
            Vesper shows you exactly what's costing you money.
          </p>
        </Reveal>
      </section>

      {/* FEATURES INTRO */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-12">
        <Reveal className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">Features</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
            Other journals track trades.<br />
            <span className="text-soft">Vesper fixes traders.</span>
          </h2>
        </Reveal>
      </section>

      {/* ZIGZAG FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 space-y-28 md:space-y-36 pb-24">
        <ZigzagFeature
          index={1}
          title="Your Vesper Score. Updated after every trade."
          plain="One number out of 100 that tells you how well you're trading — not how much you made."
          description="Vesper grades six things from your own trades: win rate consistency, risk/reward, risk management, discipline, emotional control, and overtrading. Each one gets its own score so you know exactly which habit to fix first."
          mockup={<TraderScoreMockup />}
        />
        <ZigzagFeature
          index={2}
          reverse
          title="A mentor that walks you through the problem."
          plain="Vesper spots something in your recent trades and talks you through it, step by step."
          description="When something meaningful happens — a revenge streak, a discipline run, a bad session — the Mentor card opens with an Observation, asks you a Question, then reveals the Insight and one Action. Calm, specific, and based on real numbers from your journal."
          mockup={<MentorMockup />}
        />
        <ZigzagFeature
          index={3}
          title="Ask your AI coach anything. Get honest answers."
          plain="A chat that already knows your trades, so you can just ask what's going wrong."
          description="Ask why you're losing, what your best setup is, or which session to avoid. Vesper reads your real trade data, answers with your actual numbers, and draws simple comparison bars whenever it stacks two things side by side."
          badge="Tradezella's AI is still coming soon. Vesper's is live now."
          mockup={<AICoachMockup />}
        />
        <ZigzagFeature
          index={4}
          reverse
          title="Your mind is costing you money. Here's the proof."
          plain="Tag how you felt and what you did wrong, and Vesper puts a dollar figure on it."
          description="Log your emotion before and after every trade, tag mistakes like FOMO, moved stop, or early exit — and tag what you did well too. Vesper adds up what each habit costs or earns you in real money."
          mockup={<PsychologyMockup />}
        />
        <ZigzagFeature
          index={5}
          title="Stop repeating the same mistakes."
          plain="Vesper warns you about bad habits before they cost you another account."
          description="Vesper automatically detects your dangerous patterns. Trading without stop loss. Revenge trading. Overtrading. Real alerts with real fixes — before your account pays the price."
          mockup={<MistakeAlertsMockup />}
        />
        <ZigzagFeature
          index={6}
          reverse
          title="Write your trading plan. Improve it with AI."
          plain="Keep your plan in the app and let Vesper rewrite it using your own results."
          description="Your plan sits on the Overview page where you'll actually read it. Tap Improve with AI and Vesper turns your real stats — best pair, best session, most expensive mistake — into specific rules you can apply to your plan in one click, or edit yourself in the Rule Book."
          mockup={<TradingPlanMockup />}
        />
        <ZigzagFeature
          index={7}
          title="See your whole month, day by day."
          plain="A calendar of your profit and loss, one square per day, with weekly totals."
          description="Green days, red days, and the running total for every week — plus the month's net P&L in the corner. Flip back through previous months to see whether you're actually building or just churning."
          mockup={<MonthlyCalendarMockup />}
        />
        <ZigzagFeature
          index={8}
          reverse
          title="See exactly what's working. And what isn't."
          plain="Charts that show which pairs, sessions, days and moods make or lose you money."
          description="P&L by pair, session, emotion and strategy, plus an equity curve, drawdown chart, day-of-week heatmap and a behaviour cost table — all filterable by date range."
          mockup={<AnalyticsMockup />}
        />
        <ZigzagFeature
          index={9}
          title="Risk the right amount. Every single trade."
          plain="Tell Vesper your account size once and it works out your lot size for every trade."
          description="Save risk presets for a live account or a funded challenge — funded mode sizes your risk from the drawdown limit instead of a flat percentage. Vesper then calculates position size, max loss and take profit, and warns you before you break a daily limit."
          mockup={<RiskEngineMockup />}
        />
        <ZigzagFeature
          index={10}
          reverse
          title="Every session gets a grade. No hiding."
          plain="At the end of the day you get a letter grade for how you traded, not just what you earned."
          description="At the end of each day Vesper scores your session out of 100, converts it to a letter grade, and checks every rule you wrote against every trade you took. Trades, win rate, net P&L and your biggest issue — one card, no excuses."
          mockup={<SessionReviewMockup />}
        />
        <ZigzagFeature
          index={11}
          title="Who were you as a trader this week?"
          plain="Vesper names the trading habit you showed this week and counts your good streaks."
          description="Vesper reads your last 7 days and names your pattern — Disciplined, Building, Over-trader, Revenge, Emotional. Then it tracks the streaks that actually matter: discipline days, clean sessions, stop loss on every trade, and days without a revenge trade."
          mockup={<IdentityStreaksMockup />}
        />
        <ZigzagFeature
          index={12}
          reverse
          title="Write your rules. Vesper enforces them."
          plain="Type your rules in normal English and Vesper checks every trade against them."
          description="Type your trading rules in plain English — max 3 trades a day, no trading after two losses, always use a stop. Vesper parses them, checks every trade automatically, and shows you each violation and what it cost you."
          mockup={<RuleBookMockup />}
        />
        <ZigzagFeature
          index={13}
          title="Close every week with a real review."
          plain="Four short questions every Sunday so you can see if you're actually improving."
          description="Your biggest mistake, what you did well, the rule you broke most, what changes next week — plus a 1–10 discipline rating. Every review is saved, and your latest score follows you onto the dashboard."
          mockup={<WeeklyReviewMockup />}
        />
      </section>

      {/* BUILT FOR EVERY TRADER */}
      <section id="built-for" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-14 max-w-2xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">Who it's for</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
            Built for every type of trader
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-4">
          <StaggerItem>
            <TraderTypeCard
              icon={Trophy}
              title="Funded Traders"
              body="Track challenge rules, drawdown limits, and profit targets. Never breach your prop firm rules again."
              tag="Prop firm ready"
            />
          </StaggerItem>
          <StaggerItem>
            <TraderTypeCard
              icon={Building2}
              title="Live Traders"
              body="Protect real capital with risk presets, daily loss limits, and live mistake alerts. Your account, defended every trade."
            />
          </StaggerItem>
          <StaggerItem>
            <TraderTypeCard
              icon={User}
              title="Learning Traders"
              body="Build discipline from day one. Track psychology, get personalised AI coaching, and grow your score with every trade."
            />
          </StaggerItem>
        </StaggerGroup>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">Pricing</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Free while we're in beta.
          </h2>
          <p className="mt-4 text-soft max-w-xl mx-auto">
            Vesper is in open beta. Every feature is unlocked. No credit card. No catch.
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
                "AI Trader Score & live coach",
                "Mistake alerts & psychology tracking",
                "Risk Engine & funded account rules",
                "Deep analytics & monthly P&L calendar",
                "Rule Book, Session Review & Weekly Review",
                "MT4 / MT5 statement & CSV import",
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

      {/* TESTIMONIALS */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-[11px] uppercase tracking-[0.18em] text-faint mb-4">
              <Quote className="size-3 text-champagne" /> Trader reviews
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Real traders. Real results.
            </h2>
            <p className="mt-3 text-soft">
              What funded, live, and day traders say after journaling with Vesper.
            </p>
          </div>

          <StaggerGroup className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote:
                  "Vesper caught that I was revenge trading within 30 minutes of every loss. Fixed it in 2 weeks. My funded account is still alive.",
                name: "Ahmed K.",
                role: "GoatFunded trader",
                initials: "AK",
              },
              {
                quote:
                  "I was paying $30/month for Tradezella. Vesper is free and the AI Coach actually works right now.",
                name: "Marcus T.",
                role: "Live forex trader",
                initials: "MT",
              },
              {
                quote:
                  "The emotion tracking showed me I lose money every time I trade feeling confident. Vesper proved it with my own data.",
                name: "Sarah L.",
                role: "Day trader",
                initials: "SL",
              },
            ].map((t) => (
              <StaggerItem key={t.name}>
                <div className="surface-card p-6 h-full flex flex-col gap-5 hover:bg-surface-2 transition-colors">
                  <Quote className="size-5 text-champagne/70" />
                  <p className="text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
                  <div className="mt-auto flex items-center gap-3 pt-4 border-t border-border">
                    <div className="size-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[11px] font-mono text-champagne">
                      {t.initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="text-xs text-faint">{t.role}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        {/* Final CTA */}
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

      <footer className="relative z-10 border-t border-border mt-8">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium tracking-tight">Vesper Journal</span>
            <span className="text-xs text-faint">© 2026 Vesper Journal. All rights reserved.</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-soft">
            <Link to="/" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <a
              href="https://twitter.com/vesperjournal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              aria-label="Vesper Journal on X (Twitter)"
            >
              <Twitter className="size-3.5" /> Twitter / X
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ---------- Hero stat cell ----------
function HeroStat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: "champagne" | "pos" | "neg" | "default";
}) {
  const toneCls =
    tone === "champagne"
      ? "text-champagne"
      : tone === "pos"
      ? "text-pos"
      : tone === "neg"
      ? "text-neg"
      : "text-foreground";
  return (
    <div className="bg-surface px-4 py-3 md:py-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{label}</div>
      <div className={`mt-1 font-semibold tracking-tight tabular text-lg md:text-2xl ${toneCls}`}>
        {value}
        {suffix && <span className="text-soft text-xs md:text-sm ml-0.5 font-normal">{suffix}</span>}
      </div>
    </div>
  );
}

// ---------- Zigzag wrapper ----------
function ZigzagFeature({
  index,
  title,
  description,
  mockup,
  reverse,
  badge,
}: {
  index: number;
  title: string;
  description: string;
  mockup: React.ReactNode;
  reverse?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${
        reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <Reveal>
        <div className="text-[11px] uppercase tracking-[0.22em] text-champagne mb-4">
          Feature {String(index).padStart(2, "0")}
        </div>
        <h3 className="text-2xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-balance">
          {title}
        </h3>
        <p className="mt-5 text-soft text-pretty leading-relaxed text-base md:text-lg">
          {description}
        </p>
        {badge && (
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-champagne/30 bg-champagne/10 text-[11px] text-champagne">
            <Sparkles className="size-3.5" />
            {badge}
          </div>
        )}
      </Reveal>
      <Reveal delay={0.1}>{mockup}</Reveal>
    </div>
  );
}

// ---------- Mockup: AI Trader Score ----------
function TraderScoreMockup() {
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-48 bg-champagne/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-champagne" />
          <span className="text-sm font-medium">AI Trader Score</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">last 30d</span>
      </div>
      <div className="flex items-end gap-3">
        <div className="text-6xl md:text-7xl font-semibold tracking-tight tabular text-champagne">67</div>
        <div className="pb-2">
          <div className="text-soft text-sm">/100</div>
          <div className="text-pos text-xs flex items-center gap-1 mt-1">
            <TrendingUp className="size-3" /> +4 this week
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {[
          { label: "Discipline", value: 72, tone: "pos" },
          { label: "Risk Management", value: 58, tone: "champagne" },
          { label: "Emotional Control", value: 49, tone: "neg" },
        ].map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-soft">{b.label}</span>
              <span className="tabular text-foreground">{b.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  b.tone === "pos" ? "bg-pos" : b.tone === "neg" ? "bg-neg" : "bg-champagne"
                }`}
                style={{ width: `${b.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-5 border-t border-border">
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-2">How to improve</div>
        <ul className="space-y-1.5 text-xs text-soft">
          <li className="flex items-start gap-2"><Check className="size-3 text-pos mt-0.5" /> Cut revenge trades after 2 losses</li>
          <li className="flex items-start gap-2"><Check className="size-3 text-pos mt-0.5" /> Always set a stop loss on entry</li>
        </ul>
      </div>
    </div>
  );
}

// ---------- Mockup: Coach Says Today ----------
function CoachSaysMockup() {
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 size-48 bg-neg/[0.1] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-champagne" />
          <span className="text-sm font-medium">Coach says today</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">live</span>
      </div>
      <div className="rounded-lg p-4 border border-neg/30 bg-neg/10 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="size-4 text-neg" />
          <span className="text-xs font-semibold uppercase tracking-wide text-neg">Revenge trading detected</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          You took <span className="tabular text-neg font-semibold">4 trades on USDCHF</span> within 12 minutes after a loss yesterday — costing you <span className="tabular text-neg font-semibold">−$340</span>.
        </p>
        <p className="text-xs text-soft mt-2">Try a 15-min cooldown after any losing trade this week.</p>
      </div>
      <div className="rounded-lg p-3 border border-pos/30 bg-pos/10">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="size-3.5 text-pos" />
          <span className="text-xs font-medium text-pos">Win of the week</span>
        </div>
        <p className="text-xs text-soft">Your London EURUSD setup is +$620 across 7 trades. Keep leaning in.</p>
      </div>
    </div>
  );
}

// ---------- Mockup: AI Coach Chat ----------
function AICoachMockup() {
  return (
    <div className="surface-card-elevated top-accent p-3 md:p-4 relative overflow-hidden">
      <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] gap-3 min-h-[320px]">
        {/* Sidebar */}
        <div className="rounded-lg bg-surface border border-border p-2 space-y-1">
          <div className="text-[9px] uppercase tracking-[0.18em] text-faint px-1 mb-1">Chats</div>
          {["Why am I losing?", "Best session?", "EURUSD review", "Risk per trade"].map((c, i) => (
            <div
              key={c}
              className={`px-2 py-1.5 rounded text-[11px] truncate ${
                i === 0 ? "bg-champagne/10 text-foreground border border-champagne/30" : "text-soft hover:bg-surface-2"
              }`}
            >
              {c}
            </div>
          ))}
        </div>
        {/* Chat panel */}
        <div className="rounded-lg bg-surface/60 border border-border flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <div className="size-6 rounded-md bg-champagne/15 ring-1 ring-champagne/30 flex items-center justify-center">
              <Sparkles className="size-3 text-champagne" />
            </div>
            <span className="text-xs font-medium">Vesper Coach</span>
            <span className="ml-auto size-1.5 rounded-full bg-pos glow-pos" />
          </div>
          <div className="flex-1 p-3 space-y-2.5 text-xs">
            <div className="ml-auto max-w-[80%] rounded-lg bg-champagne/15 border border-champagne/30 px-3 py-2 text-foreground">
              Why am I losing on Fridays?
            </div>
            <div className="max-w-[90%] rounded-lg bg-surface-2 border border-border px-3 py-2 text-soft leading-relaxed">
              Your Friday NY session is <span className="text-neg tabular">−$420</span> over 9 trades. You also tag "tired" 6 of those times. Try ending your week at London close.
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
            <div className="flex-1 h-7 rounded-md bg-surface border border-border px-2 text-[11px] text-faint flex items-center">
              Ask anything…
            </div>
            <div className="size-7 rounded-md bg-champagne flex items-center justify-center">
              <Send className="size-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Mockup: Psychology ----------
function PsychologyMockup() {
  const emotions = [
    { l: "Calm", active: true, tone: "pos" },
    { l: "Confident", active: false },
    { l: "FOMO", active: true, tone: "neg" },
    { l: "Greedy", active: false },
    { l: "Tired", active: false },
    { l: "Revenge", active: false },
  ];
  const mistakes = [
    { l: "No stop loss", active: false },
    { l: "Moved SL", active: true, tone: "neg" },
    { l: "Early exit", active: false },
    { l: "Overtrade", active: true, tone: "neg" },
    { l: "Chased entry", active: false },
  ];
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-champagne" />
          <span className="text-sm font-medium">New trade · Psychology</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">EURUSD · BUY</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-2">Emotion before</div>
      <div className="flex flex-wrap gap-2 mb-5">
        {emotions.map((e) => (
          <span
            key={e.l}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              e.active && e.tone === "pos"
                ? "border-pos/40 bg-pos/15 text-pos"
                : e.active && e.tone === "neg"
                ? "border-neg/40 bg-neg/15 text-neg"
                : "border-border bg-surface text-soft"
            }`}
          >
            {e.l}
          </span>
        ))}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-2">Mistakes</div>
      <div className="flex flex-wrap gap-2 mb-5">
        {mistakes.map((m) => (
          <span
            key={m.l}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              m.active
                ? "border-neg/40 bg-neg/15 text-neg"
                : "border-border bg-surface text-soft"
            }`}
          >
            {m.l}
          </span>
        ))}
      </div>
      <div className="rounded-lg p-3 border border-neg/20 bg-neg/5 flex items-center justify-between">
        <span className="text-xs text-soft">FOMO this month</span>
        <span className="tabular text-neg font-semibold text-sm">−$520</span>
      </div>
    </div>
  );
}

// ---------- Mockup: Mistake Alerts ----------
function MistakeAlertsMockup() {
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-neg" />
          <span className="text-sm font-medium">Mistake Alerts</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">3 active</span>
      </div>
      <div className="space-y-3">
        <AlertRow
          severity="HIGH"
          title="Trading without stop loss"
          body="3 of your last 10 trades had no SL. Average loss: −$140."
          fix="Always set SL before clicking buy."
        />
        <AlertRow
          severity="HIGH"
          title="Revenge trading pattern"
          body="You take 2.4× more trades within 30 min of a loss."
          fix="Enforce a 15-min cooldown after losers."
        />
        <AlertRow
          severity="MED"
          title="Overtrading on Fridays"
          body="14 trades last Friday vs 6 daily average."
          fix="Cap your Friday session at 8 trades."
        />
      </div>
    </div>
  );
}

function AlertRow({
  severity,
  title,
  body,
  fix,
}: {
  severity: "HIGH" | "MED";
  title: string;
  body: string;
  fix: string;
}) {
  const isHigh = severity === "HIGH";
  return (
    <div
      className={`rounded-lg p-3 border ${
        isHigh ? "border-neg/30 bg-neg/10" : "border-champagne/30 bg-champagne/10"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`text-[9px] uppercase tracking-[0.18em] font-semibold px-1.5 py-0.5 rounded ${
            isHigh ? "bg-neg/30 text-neg" : "bg-champagne/30 text-champagne"
          }`}
        >
          {severity}
        </span>
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="text-xs text-soft leading-relaxed">{body}</p>
      <p className="text-[11px] text-foreground/80 mt-1.5 flex items-start gap-1.5">
        <ChevronRight className="size-3 text-champagne mt-0.5 shrink-0" /> {fix}
      </p>
    </div>
  );
}

// ---------- Mockup: Analytics ----------
function AnalyticsMockup() {
  const pairs = [
    { l: "EURUSD", v: 1240, pos: true },
    { l: "GBPUSD", v: 680, pos: true },
    { l: "USDJPY", v: 220, pos: true },
    { l: "USDCHF", v: -340, pos: false },
    { l: "XAUUSD", v: -560, pos: false },
  ];
  const emotions = [
    { l: "Confident", v: 1680, pos: true },
    { l: "Calm", v: 920, pos: true },
    { l: "FOMO", v: -520, pos: false },
    { l: "Revenge", v: -780, pos: false },
  ];
  const max = Math.max(...pairs.map((p) => Math.abs(p.v)), ...emotions.map((e) => Math.abs(e.v)));

  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-champagne" />
          <span className="text-sm font-medium">Analytics</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">last 90d</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-3">P&L by pair</div>
          <div className="space-y-2">
            {pairs.map((p) => (
              <BarRow key={p.l} label={p.l} value={p.v} max={max} pos={p.pos} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-3">P&L by emotion</div>
          <div className="space-y-2">
            {emotions.map((e) => (
              <BarRow key={e.l} label={e.l} value={e.v} max={max} pos={e.pos} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, pos }: { label: string; value: number; max: number; pos: boolean }) {
  const pct = Math.max(6, (Math.abs(value) / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-soft">{label}</span>
        <span className={`tabular ${pos ? "text-pos" : "text-neg"}`}>
          {pos ? "+" : "−"}${Math.abs(value)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full ${pos ? "bg-pos" : "bg-neg"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------- Mockup: Risk Engine ----------
function RiskEngineMockup() {
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-champagne" />
          <span className="text-sm font-medium">New risk preset</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-pos px-2 py-0.5 rounded-full bg-pos/10 border border-pos/30">
          Conservative
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Field label="Risk %" value="1.0%" />
        <Field label="R:R" value="1 : 2.5" />
        <Field label="Daily loss limit" value="$200" />
        <Field label="Max trades / day" value="5" />
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-3.5 text-champagne" />
          <span className="text-xs font-medium">Live drawdown projection</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Per trade", v: "$50", tone: "default" },
            { l: "5 losses", v: "−$250", tone: "champagne" },
            { l: "10 losses", v: "−$500", tone: "neg" },
          ].map((s) => (
            <div key={s.l} className="rounded-md bg-surface-2 p-2.5">
              <div className="text-[9px] uppercase tracking-[0.18em] text-faint">{s.l}</div>
              <div
                className={`mt-1 tabular text-sm font-semibold ${
                  s.tone === "neg" ? "text-neg" : s.tone === "champagne" ? "text-champagne" : "text-foreground"
                }`}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface border border-border px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{label}</div>
      <div className="mt-1 tabular text-sm font-medium">{value}</div>
    </div>
  );
}

// ---------- Trader type card ----------
function TraderTypeCard({
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

// ---------- Mockup: Session Review ----------
function SessionReviewMockup() {
  const rules = [
    { l: "Max 3 trades per day", ok: true },
    { l: "Stop loss on every entry", ok: true },
    { l: "No trade within 20m of a loss", ok: false },
    { l: "London session only", ok: true },
  ];
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-48 bg-champagne/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-champagne" />
          <span className="text-sm font-medium">Today's session review</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">live</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="size-24 rounded-2xl border border-champagne/30 bg-champagne/10 flex flex-col items-center justify-center shrink-0">
          <div className="text-4xl font-semibold leading-none tabular text-champagne">B</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint mt-1">85/100</div>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {[
            { l: "Trades", v: "3", tone: "" },
            { l: "Win rate", v: "67%", tone: "" },
            { l: "Net P&L", v: "+$240", tone: "pos" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-border bg-surface px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-faint">{s.l}</div>
              <div className={`tabular text-base mt-1 ${s.tone === "pos" ? "text-pos" : "text-foreground"}`}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-faint mb-2.5">Rule adherence</div>
        <ul className="space-y-2 text-xs">
          {rules.map((r) => (
            <li key={r.l} className="flex items-center gap-2.5">
              <span
                className={`size-5 rounded-md flex items-center justify-center shrink-0 border ${
                  r.ok ? "bg-pos/15 border-pos/30" : "bg-neg/15 border-neg/30"
                }`}
              >
                {r.ok ? <Check className="size-3 text-pos" /> : <AlertTriangle className="size-3 text-neg" />}
              </span>
              <span className={r.ok ? "text-soft" : "text-foreground"}>{r.l}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-lg border border-champagne/25 bg-champagne/10 px-3 py-2 text-xs text-champagne">
        Biggest issue today: trading too soon after a loss
      </div>
    </div>
  );
}

// ---------- Mockup: Identity + Streaks ----------
function IdentityStreaksMockup() {
  const streaks = [
    { l: "Discipline days", v: "6", tone: "pos" },
    { l: "Clean sessions", v: "4", tone: "pos" },
    { l: "SL on every trade", v: "9", tone: "pos" },
    { l: "No revenge trades", v: "2", tone: "champagne" },
  ];
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 size-48 bg-pos/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-champagne" />
          <span className="text-sm font-medium">This week's identity</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">last 7d</span>
      </div>
      <div className="rounded-lg border border-pos/30 bg-pos/10 p-4">
        <div className="text-2xl font-semibold tracking-tight text-pos">Building</div>
        <p className="text-xs text-soft mt-1.5 leading-relaxed">
          You followed your plan on <span className="tabular text-foreground">11 of 14 trades</span> and cut your
          average loss by <span className="tabular text-foreground">18%</span>. One more clean week and you're Disciplined.
        </p>
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-faint mt-5 mb-2.5">Streaks</div>
      <div className="grid grid-cols-2 gap-2.5">
        {streaks.map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`tabular text-2xl ${s.tone === "pos" ? "text-pos" : "text-champagne"}`}>{s.v}</span>
              <span className="text-[10px] text-faint">days</span>
              <Flame className={`size-3 ml-auto ${s.tone === "pos" ? "text-pos" : "text-champagne"}`} />
            </div>
            <div className="text-[11px] text-soft mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Mockup: Rule Book ----------
function RuleBookMockup() {
  const rules = [
    { l: "Max 3 trades per day", n: 1 },
    { l: "Never trade without a stop loss", n: 0 },
    { l: "No trades after 2 losses", n: 2 },
    { l: "Risk max 1% per trade", n: 0 },
  ];
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-48 bg-champagne/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-champagne" />
          <span className="text-sm font-medium">Rule Book</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">4 active</span>
      </div>
      <div className="rounded-lg bg-surface border border-border px-3 py-2 text-[11px] text-faint mb-3">
        Write a rule in plain English…
      </div>
      <div className="space-y-2">
        {rules.map((r) => (
          <div
            key={r.l}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <span className="size-1.5 rounded-full bg-champagne shrink-0" />
            <span className="text-xs text-foreground truncate">{r.l}</span>
            <span
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                r.n === 0
                  ? "border-pos/30 bg-pos/10 text-pos"
                  : "border-neg/30 bg-neg/10 text-neg"
              }`}
            >
              {r.n === 0 ? "clean" : `${r.n} broken`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">Cost of broken rules</span>
        <span className="tabular text-neg text-lg">−$510</span>
      </div>
    </div>
  );
}

// ---------- Mockup: Weekly Review ----------
function WeeklyReviewMockup() {
  return (
    <div className="surface-card-elevated top-accent p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 size-48 bg-champagne/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-champagne" />
          <span className="text-sm font-medium">Weekly review</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-faint">week of Mar 4</span>
      </div>
      <div className="space-y-2.5">
        {[
          { q: "What went well this week?", a: "London EURUSD continuations — 4 of 5 winners." },
          { q: "What cost you the most?", a: "Two revenge trades on Wednesday, −$260." },
          { q: "What changes next week?", a: "Hard stop after two losses. No NY session." },
        ].map((r) => (
          <div key={r.q} className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{r.q}</div>
            <div className="text-xs text-soft mt-1 leading-relaxed">{r.a}</div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-faint mb-2">
          <span>Discipline rating</span>
          <span className="tabular text-champagne text-sm normal-case tracking-normal">7 / 10</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-champagne" style={{ width: "70%" }} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-soft">
          <TrendingUp className="size-3 text-pos" /> Up from 5 last week
        </div>
      </div>
    </div>
  );
}
