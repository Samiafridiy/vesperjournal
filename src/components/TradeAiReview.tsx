import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reviewTrade, type ReviewResponse } from "@/lib/trade-review.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";

export function TradeAiReview({ tradeId, hasScreenshots }: { tradeId: string; hasScreenshots: boolean }) {
  const run = useServerFn(reviewTrade);
  const [state, setState] = useState<ReviewResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    setState(null);
    run({ data: { tradeId, run: false } }).then((r) => { if (!off) setState(r); }).catch(() => {});
    return () => { off = true; };
  }, [tradeId, run]);

  if (!hasScreenshots) return null;

  async function go() {
    setBusy(true);
    try {
      setState(await run({ data: { tradeId, run: true } }));
    } catch {
      setState((s) => (s ? { ...s, error: "The review couldn't be completed. Please try again." } : s));
    } finally {
      setBusy(false);
    }
  }

  const r = state?.review;
  return (
    <div className="mb-5 surface-card top-accent p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="text-sm font-medium flex items-center gap-2"><Sparkles className="size-4 text-champagne" /> AI review</div>
        {r && !busy && (
          <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={go} disabled={!state?.stale && false}>
            <RefreshCw className="size-3.5" /> Re-run review
          </Button>
        )}
      </div>
      <p className="text-xs text-faint mb-3">A second opinion on your process, not a trade signal.</p>

      {busy && (
        <div className="flex items-center gap-2 text-sm text-soft py-3"><Loader2 className="size-4 animate-spin text-champagne" /> Reviewing your screenshots and notes…</div>
      )}

      {!busy && !r && (
        <Button className="w-full bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2" onClick={go} disabled={!state}>
          <Sparkles className="size-4" /> Review my analysis with AI
        </Button>
      )}

      {!busy && r && (
        <div className="space-y-3 text-sm">
          {state?.stale && (
            <div className="text-xs text-champagne">Your screenshots, notes or trade details changed since this review. Re-run to update it.</div>
          )}
          <p className="text-foreground leading-relaxed">{r.summary}</p>
          <Section title="What's consistent" items={r.consistent} tone="pos" />
          <Section title="What conflicts or is missing" items={r.conflicts} tone="neg" />
          {r.suggestion && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-faint mb-1">One suggestion for next time</div>
              <p className="text-soft">{r.suggestion}</p>
            </div>
          )}
          {state?.createdAt && <div className="text-[11px] text-faint font-mono">Reviewed {new Date(state.createdAt).toLocaleString()}</div>}
        </div>
      )}

      {state?.error && !busy && <p className="text-xs text-soft mt-3">{state.error}</p>}
      {state && <p className="text-[11px] text-faint mt-2">{state.usedToday}/{state.cap} reviews used today</p>}
    </div>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: "pos" | "neg" }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-faint mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-soft">
            <span className={tone === "pos" ? "text-pos" : "text-neg"}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
