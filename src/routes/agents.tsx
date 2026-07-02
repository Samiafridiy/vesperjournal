import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { Zap, Tag, ClipboardCheck, Check } from "lucide-react";
import { SessionReviewCard } from "@/components/agents/SessionReviewCard";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Vesper Journal" },
      {
        name: "description",
        content: "Automated agents that tag your trades and review each session.",
      },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <AgentsPage />
      </AppShell>
    </RouteGate>
  ),
});

function AgentsPage() {
  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1200px] mx-auto">
      <header className="border-b border-border pb-6 mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Zap className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">
            Automation
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Agents</h1>
        <p className="text-soft mt-2 max-w-2xl text-sm">
          Background agents that run on your data automatically — no prompts, no waiting.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent 1 — Trade Auto-Tagger */}
        <div className="surface-card-elevated top-accent p-5 md:p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-9 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
                <Tag className="size-4 text-champagne" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight truncate">
                  Trade Auto-Tagger
                </h2>
                <div className="text-[10px] uppercase tracking-[0.18em] text-pos font-medium mt-0.5">
                  ● Active
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-soft leading-relaxed mb-4">
            Runs every time a trade is saved. Adds tags to each row in your History based on
            duration, session, entry quality, and behavior.
          </p>
          <ul className="flex flex-col gap-2 text-xs text-soft">
            <TagRow chip={<Chip label="Scalp" tone="neutral" />} text="Held under 5 minutes" />
            <TagRow chip={<Chip label="Short-hold" tone="neutral" />} text="5–30 minutes" />
            <TagRow chip={<Chip label="Swing" tone="neutral" />} text="Over 30 minutes" />
            <TagRow chip={<Chip label="Clean-entry" tone="pos" />} text="Win + plan followed + SL used" />
            <TagRow chip={<Chip label="Lucky-entry" tone="warn" />} text="Win but plan not followed" />
            <TagRow chip={<Chip label="Poor-entry" tone="neg" />} text="Loss + plan not followed" />
          </ul>
        </div>

        {/* Agent 2 — Session Review */}
        <div className="surface-card-elevated top-accent p-5 md:p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-9 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
                <ClipboardCheck className="size-4 text-champagne" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight truncate">
                  Session Review
                </h2>
                <div className="text-[10px] uppercase tracking-[0.18em] text-pos font-medium mt-0.5">
                  ● Active
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-soft leading-relaxed mb-4">
            Grades every trading day A–F from your own data — rule adherence, daily limit,
            stop-loss discipline, and entry quality. Appears at the bottom of your Overview.
          </p>
          <ul className="flex flex-col gap-2 text-xs text-soft">
            <li className="flex items-center gap-2"><Check className="size-3.5 text-pos shrink-0" /> −15 per Rule Book rule violated</li>
            <li className="flex items-center gap-2"><Check className="size-3.5 text-pos shrink-0" /> −10 if daily trade limit exceeded</li>
            <li className="flex items-center gap-2"><Check className="size-3.5 text-pos shrink-0" /> −20 if any trade had no stop loss</li>
            <li className="flex items-center gap-2"><Check className="size-3.5 text-pos shrink-0" /> −10 per Poor-entry tag</li>
          </ul>
        </div>
      </div>

      {/* Live preview of Session Review */}
      <div className="mt-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium mb-3">
          Today's output
        </div>
        <SessionReviewCard />
      </div>
    </div>
  );
}

function TagRow({ chip, text }: { chip: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 min-w-0">
      <span className="shrink-0">{chip}</span>
      <span className="truncate">{text}</span>
    </li>
  );
}

function Chip({ label, tone }: { label: string; tone: "pos" | "neg" | "warn" | "neutral" }) {
  const cls =
    tone === "pos"
      ? "bg-pos/10 text-pos border-pos/20"
      : tone === "neg"
      ? "bg-neg/10 text-neg border-neg/20"
      : tone === "warn"
      ? "bg-champagne/10 text-champagne border-champagne/20"
      : "bg-surface-2 text-soft border-border";
  return (
    <span className={"px-1.5 py-0.5 rounded-md text-[10px] font-medium border " + cls}>
      {label}
    </span>
  );
}