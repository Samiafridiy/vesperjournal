import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import { getCooldownUntil, clearCooldown } from "@/lib/intervention";

function fmt(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Calm, dismissible banner shown after consecutive losses. */
export function CooldownBanner() {
  const [until, setUntil] = useState<number>(() => getCooldownUntil());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        clearCooldown();
        setUntil(0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!until || now >= until) return null;
  const remaining = until - now;

  return (
    <div className="mb-6 rounded-lg border border-champagne/30 bg-champagne/5 px-4 py-3 flex items-start gap-3 tl-fade-up">
      <Timer className="size-4 text-champagne mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium text-champagne">Cooldown active</div>
        <div className="text-xs text-soft mt-0.5">
          You've had consecutive losses. Vesper recommends a short break. Time remaining:{" "}
          <span className="font-mono text-foreground">{fmt(remaining)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { clearCooldown(); setUntil(0); }}
        className="text-soft hover:text-foreground transition-colors"
        aria-label="Dismiss cooldown"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}