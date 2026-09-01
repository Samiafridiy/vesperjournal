import { Link } from "@tanstack/react-router";
import { ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTradingPlan } from "@/hooks/use-trading-plan";

export function TradingPlanCard() {
  const { plan, updatedAt, loading } = useTradingPlan();
  const hasPlan = plan.trim().length > 0;

  return (
    <div className="surface-card-elevated top-accent p-6 h-full min-h-0 flex flex-col hover-glow hover-glow-champagne">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <ClipboardList className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Trading Plan
        </span>
      </div>

      {loading ? (
        <div className="text-xs text-soft flex-1">Loading…</div>
      ) : hasPlan ? (
        <>
          <div className="relative flex-1 min-h-[8rem] rounded-lg border border-border bg-surface overflow-hidden">
            <div className="absolute inset-0 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch]">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{plan}</p>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent rounded-b-lg" />
          </div>
          {updatedAt && (
            <div className="mt-3 text-[11px] text-faint shrink-0">
              Last updated:{" "}
              {new Date(updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center min-h-[8rem]">
          <p className="text-sm text-soft">You haven't set your trading plan yet.</p>
          <Link to="/rule-book" className="mt-4">
            <Button className="w-full bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11">
              Set up your plan <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}

      {!loading && (
        <Link to="/coach" search={{ plan: 1, insight: undefined }} className="mt-4 block shrink-0">
          <Button
            variant="outline"
            className="w-full gap-2 h-10 border-champagne/30 text-champagne hover:bg-champagne/10 hover:text-champagne"
          >
            <Sparkles className="size-4" /> Improve with AI
          </Button>
        </Link>
      )}
    </div>
  );
}
