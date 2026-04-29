import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Loader2, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import type { Trade } from "@/lib/trade-utils";
import { buildTraderContext } from "@/lib/coach-context";
import { askVesper } from "@/server/coach.functions";
import { useAuth } from "@/lib/auth";

function dismissKey(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `vesper.coach-says.${uid}.${day}`;
}

export function CoachSaysToday({ trades }: { trades: Trade[] }) {
  const { user } = useAuth();
  const ask = useServerFn(askVesper);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || trades.length === 0) return;
    const key = dismissKey(user.id);
    if (typeof window !== "undefined" && localStorage.getItem(key) === "1") {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const recent = trades.slice(0, 30);
    const ctx = buildTraderContext(recent);
    ask({
      data: {
        context: ctx,
        mode: "insight",
        messages: [
          {
            role: "user",
            content:
              "Give me ONE specific coaching insight based on my last 30 trades. Reference real numbers, pairs, or mistakes from my data.",
          },
        ],
      },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.error) setErr(res.error);
        else setMsg(res.reply);
      })
      .catch(() => !cancelled && setErr("Failed to reach AI."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function dismiss() {
    if (user) localStorage.setItem(dismissKey(user.id), "1");
    setDismissed(true);
  }

  if (dismissed || trades.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="surface-card-elevated top-accent p-5 mb-6 relative overflow-hidden"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-faint hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
            <Brain className="size-4 text-champagne" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
                Coach says today
              </span>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-soft mt-1">
                <Loader2 className="size-3.5 animate-spin" /> Vesper is analyzing your last 30 trades…
              </div>
            )}
            {err && <div className="text-sm text-neg mt-1">{err}</div>}
            {msg && (
              <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown>{msg}</ReactMarkdown>
              </div>
            )}
            <Link
              to="/coach"
              className="inline-flex items-center gap-1.5 text-xs text-champagne hover:underline mt-3"
            >
              <MessageSquare className="size-3.5" /> Continue with Vesper →
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}