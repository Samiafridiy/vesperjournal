import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, Star } from "lucide-react";
import { useWeeklyReviews } from "@/hooks/use-weekly-reviews";
import { weekStart } from "@/lib/rule-engine";
import { cn } from "@/lib/utils";

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function WeeklyReviewCard() {
  const { reviews } = useWeeklyReviews();
  const currentKey = useMemo(() => toDateKey(weekStart(new Date())), []);
  const thisWeek = reviews.find((r) => r.week_start === currentKey);
  const last = thisWeek ?? reviews[0];

  return (
    <Link
      to="/weekly-review"
      className="surface-card p-5 flex items-center gap-4 hover-glow hover-glow-champagne block"
    >
      <div className="size-11 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0 text-champagne">
        <ClipboardList className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-faint font-medium">
          Weekly Review
        </div>
        {!last ? (
          <div className="text-sm mt-1">
            No reviews yet — <span className="text-champagne">start this week's →</span>
          </div>
        ) : !thisWeek ? (
          <div className="text-sm mt-1">
            <span className="text-champagne">Complete this week's review →</span>
            <div className="text-xs text-faint mt-0.5">
              Last: {last.discipline_rating}/10 · {new Date(last.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 mt-1">
            <span className={cn(
              "font-mono text-2xl font-medium tabular-nums",
              thisWeek.discipline_rating >= 7 ? "text-pos" :
              thisWeek.discipline_rating >= 4 ? "text-champagne" : "text-neg",
            )}>
              {thisWeek.discipline_rating}
            </span>
            <span className="text-xs text-soft">/ 10 discipline this week</span>
            <Star className="size-3 text-champagne ml-auto" />
          </div>
        )}
      </div>
    </Link>
  );
}