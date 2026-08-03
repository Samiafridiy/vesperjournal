import { Link } from "@tanstack/react-router";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTradingPlan } from "@/hooks/use-trading-plan";

export function TradingPlanCard() {
  const { plan, loading } = useTradingPlan();
  const hasPlan = plan.trim().length > 0;

  return (
    <div className="surface-card-elevated top-accent p-6 flex flex-col hover-glow hover-glow-champagne">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="size-4 text-champagne" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Trading Plan
        </span>
      </div>

      {loading ? (
        <div className="text-xs text-soft flex-1">Loading…</div>
      ) : hasPlan ? (
        <div className="rounded-lg p-4 border border-border bg-surface flex-1 overflow-auto max-h-64">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{plan}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm text-soft">You haven't set your trading plan yet.</p>
          <Link to="/rule-book" className="mt-4">
            <Button className="w-full bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11">
              Set up your plan <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
