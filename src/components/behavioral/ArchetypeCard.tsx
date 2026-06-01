import { motion } from "framer-motion";
import { Flame, Zap, Hand, Shield, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Archetype } from "@/lib/behavioral-intel";
import { toast } from "sonner";

const ICONS = { flame: Flame, zap: Zap, hand: Hand, shield: Shield } as const;

const TONE: Record<Archetype["key"], { ring: string; text: string; glow: string }> = {
  revenge_avenger: { ring: "var(--neg)", text: "text-neg", glow: "color-mix(in oklab, var(--neg) 35%, transparent)" },
  over_trader: { ring: "var(--champagne)", text: "text-champagne", glow: "color-mix(in oklab, var(--champagne) 35%, transparent)" },
  hesitant_winner: { ring: "var(--champagne)", text: "text-champagne", glow: "color-mix(in oklab, var(--champagne) 30%, transparent)" },
  discipline_master: { ring: "var(--pos)", text: "text-pos", glow: "color-mix(in oklab, var(--pos) 35%, transparent)" },
};

export function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  const Icon = ICONS[archetype.iconName];
  const tone = TONE[archetype.key];

  async function share() {
    const text = `My trader archetype: ${archetype.title} — ${archetype.evidence || archetype.explanation}\n\nVesper Journal · behavioral intelligence for traders`;
    try {
      if (navigator.share) {
        await navigator.share({ title: archetype.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Archetype copied to clipboard");
      }
    } catch {
      // user cancelled or unsupported
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface-card-elevated top-accent p-6 flex flex-col gap-4 relative overflow-hidden h-full"
    >
      <div
        aria-hidden
        className="absolute -top-24 -left-16 size-56 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: tone.ring }}
      />
      <div className="flex items-center gap-2 relative">
        <Sparkles className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Trader Archetype
        </span>
      </div>

      <div className="flex items-start gap-4 relative">
        <div
          className="size-14 rounded-xl flex items-center justify-center shrink-0 ring-1"
          style={{
            background: `color-mix(in oklab, ${tone.ring} 12%, transparent)`,
            boxShadow: `0 0 24px -6px ${tone.glow}`,
            borderColor: `color-mix(in oklab, ${tone.ring} 35%, transparent)`,
          }}
        >
          <Icon className={`size-6 ${tone.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-xl font-semibold ${tone.text} leading-tight`}>{archetype.title}</h3>
          {archetype.evidence && (
            <div className="text-[11px] uppercase tracking-[0.14em] text-faint mt-1">
              {archetype.evidence}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-soft leading-relaxed relative">{archetype.explanation}</p>

      <div className="rounded-lg border border-champagne/20 bg-champagne/[0.06] p-3 relative">
        <div className="text-[10px] uppercase tracking-[0.18em] text-champagne mb-1 font-medium">
          One rule to improve
        </div>
        <div className="text-sm leading-relaxed">{archetype.rule}</div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border relative">
        <span className="text-[11px] text-faint">
          Based on {archetype.sampleSize} recent trade{archetype.sampleSize === 1 ? "" : "s"}
        </span>
        <Button size="sm" variant="ghost" onClick={share} className="gap-1.5 text-xs h-8">
          <Share2 className="size-3.5" /> Share
        </Button>
      </div>
    </motion.div>
  );
}