import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, X, ArrowRight } from "lucide-react";
import type { Trade } from "@/lib/trade-utils";
import { buildTraderContext } from "@/lib/coach-context";
import { askVesper } from "@/lib/coach.functions";
import { useAuth } from "@/lib/auth";
import { stripCoachTags, headlineFrom, INSIGHT_STORAGE_KEY } from "@/lib/coach-format";

function tipKey(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `vesper.daily-tip.${uid}.${day}`;
}

export function DailyInsightCard({ trades }: { trades: Trade[] }) {
  const { user } = useAuth();
  const ask = useServerFn(askVesper);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState("");
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || trades.length < 3) return;
    const key = tipKey(user.id);
    if (typeof window === "undefined" || localStorage.getItem(key) === "1") return;

    let cancelled = false;
    setOpen(true);
    setLoading(true);
    const ctx = buildTraderContext(trades.slice(0, 30));
    ask({
      data: {
        context: ctx,
        mode: "insight",
        messages: [
          {
            role: "user",
            content:
              "Give me ONE specific actionable insight for today based on my recent trades. Pick the highest-impact pattern (worst session, recurring mistake, or best setup). Reference real numbers.",
          },
        ],
      },
    })
      .then((res) => {
        if (cancelled) return;
        const text = res.error ? `⚠️ ${res.error}` : res.reply;
        setFull(text);
        localStorage.setItem(key, "1");
        try {
          localStorage.setItem(INSIGHT_STORAGE_KEY, text);
        } catch {
          /* ignore */
        }
      })
      .catch(() => !cancelled && setFull("⚠️ Failed to load today's insight."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, trades.length >= 3]);

  // Dismiss on any click outside the card.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const headline = headlineFrom(stripCoachTags(full));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6 rounded-xl border border-border bg-surface/80 backdrop-blur px-4 py-3 pr-9"
        >
          <button
            type="button"
            aria-label="Dismiss insight"
            onClick={() => setOpen(false)}
            className="absolute top-2.5 right-2.5 text-faint hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="size-7 shrink-0 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
              <Brain className="size-3.5 text-champagne" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-soft font-medium mb-1">
                Vesper's insight
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-soft">
                  <Loader2 className="size-3.5 animate-spin" /> Analyzing your recent trades…
                </div>
              ) : (
                <>
                  <p className="text-sm leading-snug line-clamp-3">{headline}</p>
                  <Link
                    to="/coach"
                    search={{ insight: 1 }}
                    onClick={() => setOpen(false)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-champagne hover:underline"
                  >
                    View full analysis <ArrowRight className="size-3" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
