import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TrendingUp, Brain, Sparkles, ArrowRight, BarChart3, Shield } from "lucide-react";

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

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[60vw] h-[60vw] bg-champagne/[0.05] rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[55vw] h-[55vw] bg-pos/[0.04] rounded-full blur-[150px]" />
      </div>

      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
            <TrendingUp className="size-4 text-champagne" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Aegis</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-soft">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-champagne text-primary-foreground hover:bg-champagne/90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 backdrop-blur text-[11px] uppercase tracking-[0.18em] text-soft mb-8">
            <span className="size-1.5 bg-champagne rounded-full glow-champagne" />
            Built for serious traders
          </div>
          <h1 className="text-balance text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
            Trade smarter,
            <br />
            <span className="text-champagne">not just more.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-soft max-w-2xl text-pretty">
            A trading journal that tracks your psychology — not just your P&L. Aegis surfaces the
            emotions, sessions, and mistakes quietly draining your edge.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2">
                Start journaling free <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-border bg-surface/60">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-5">
          <Feature
            icon={Brain}
            title="Psychology tracking"
            body="Log emotions before and after each trade. Tag mistakes like FOMO and revenge trading. See what your mind is doing under pressure."
          />
          <Feature
            icon={Sparkles}
            title="Smart insights"
            body="Aegis reads your journal and tells you the truth — your worst session, costliest mistake, and which emotion sabotages your edge."
          />
          <Feature
            icon={BarChart3}
            title="Clean analytics"
            body="Equity curve, win rate, profit factor, R:R — auto-calculated and updated in real time. No spreadsheets, no friction."
          />
        </div>

        <div className="mt-24 surface-card-elevated top-accent p-8 md:p-12 max-w-3xl">
          <Shield className="size-5 text-champagne mb-4" />
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Your trades. Your data. Encrypted and private.
          </h2>
          <p className="mt-3 text-soft text-pretty">
            Every trade you log is scoped to your account with row-level security. Aegis never
            shares, sells, or even glances at your data.
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-faint">
          <span>© Aegis Journal</span>
          <span className="font-mono">SYS.READY</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof TrendingUp;
  title: string;
  body: string;
}) {
  return (
    <div className="surface-card p-7 hover:bg-surface-2 transition-colors group">
      <div className="size-10 rounded-lg bg-champagne/10 ring-1 ring-champagne/20 flex items-center justify-center mb-5 group-hover:glow-champagne transition-shadow">
        <Icon className="size-5 text-champagne" />
      </div>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-soft text-pretty leading-relaxed">{body}</p>
    </div>
  );
}
