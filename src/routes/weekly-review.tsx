import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { useWeeklyReviews, type WeeklyReview } from "@/hooks/use-weekly-reviews";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, Star } from "lucide-react";
import { weekStart } from "@/lib/rule-engine";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/weekly-review")({
  head: () => ({
    meta: [
      { title: "Weekly Review — Vesper Journal" },
      { name: "description", content: "Structured weekly reflection to compound discipline." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <WeeklyReviewPage />
      </AppShell>
    </RouteGate>
  ),
});

const MAX_TEXT = 1000;

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function WeeklyReviewPage() {
  const { user } = useAuth();
  const { reviews, loading } = useWeeklyReviews();

  const currentWeekKey = useMemo(() => toDateKey(weekStart(new Date())), []);
  const existing = useMemo(
    () => reviews.find((r) => r.week_start === currentWeekKey),
    [reviews, currentWeekKey],
  );

  const [biggestMistake, setBiggestMistake] = useState(existing?.biggest_mistake ?? "");
  const [didWell, setDidWell] = useState(existing?.did_well ?? "");
  const [brokenRule, setBrokenRule] = useState(existing?.broken_rule ?? "");
  const [doDifferently, setDoDifferently] = useState(existing?.do_differently ?? "");
  const [rating, setRating] = useState<number>(existing?.discipline_rating ?? 7);
  const [saving, setSaving] = useState(false);

  // Sync when the existing review changes (e.g. after first save).
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  if (existing && existing.id !== lastSeenId) {
    setLastSeenId(existing.id);
    setBiggestMistake(existing.biggest_mistake ?? "");
    setDidWell(existing.did_well ?? "");
    setBrokenRule(existing.broken_rule ?? "");
    setDoDifferently(existing.do_differently ?? "");
    setRating(existing.discipline_rating);
  }

  async function save() {
    if (!user) return;
    if (rating < 1 || rating > 10) {
      toast.error("Discipline rating must be 1–10.");
      return;
    }
    const payload = {
      user_id: user.id,
      week_start: currentWeekKey,
      biggest_mistake: biggestMistake.trim().slice(0, MAX_TEXT) || null,
      did_well: didWell.trim().slice(0, MAX_TEXT) || null,
      broken_rule: brokenRule.trim().slice(0, MAX_TEXT) || null,
      do_differently: doDifferently.trim().slice(0, MAX_TEXT) || null,
      discipline_rating: rating,
    };
    setSaving(true);
    const { error } = await supabase
      .from("weekly_reviews")
      .upsert(payload, { onConflict: "user_id,week_start" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Weekly review saved");
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1100px] mx-auto">
      <header className="border-b border-border pb-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-soft">Reflect</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Weekly Review</h1>
        <p className="text-soft mt-2 max-w-2xl">
          Five questions, once a week. The traders who compound are the ones who review.
        </p>
      </header>

      {/* This week */}
      <section className="surface-card-elevated top-accent p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
              This week
            </div>
            <div className="text-sm text-soft mt-1">
              Week of {new Date(currentWeekKey).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {existing && " · Saved"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <Question
            label="1. What was your biggest mistake this week?"
            value={biggestMistake}
            onChange={setBiggestMistake}
            placeholder="Be specific — name the trade, the setup, or the emotion."
          />
          <Question
            label="2. What did you do well?"
            value={didWell}
            onChange={setDidWell}
            placeholder="Concrete wins of discipline or process, not just P&L."
          />
          <Question
            label="3. Which rule did you break most often?"
            value={brokenRule}
            onChange={setBrokenRule}
            placeholder="The pattern you keep falling into."
          />
          <Question
            label="4. What will you do differently next week?"
            value={doDifferently}
            onChange={setDoDifferently}
            placeholder="One specific change. Something you can measure."
          />

          <div>
            <label className="text-sm font-medium block mb-2">
              5. Rate your discipline this week (1–10)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={cn(
                    "size-9 rounded-md border text-sm font-mono tabular-nums transition-colors",
                    rating === n
                      ? "bg-champagne/15 border-champagne/50 text-champagne"
                      : "bg-surface-2 border-border text-soft hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11"
          >
            <Save className="size-4" />
            {existing ? "Update review" : "Save review"}
          </Button>
        </div>
      </section>

      {/* History */}
      <section>
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium mb-3">
          History
        </div>
        {loading ? (
          <div className="surface-card p-8 text-center text-soft text-sm">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="surface-card p-8 text-center text-soft text-sm">
            No reviews yet. Your reflections will live here.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Question({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-2">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_TEXT}
        rows={3}
        className="bg-surface-2 border-border resize-none"
      />
      <div className="text-[11px] text-faint mt-1 text-right">{value.length}/{MAX_TEXT}</div>
    </div>
  );
}

function ReviewRow({ review }: { review: WeeklyReview }) {
  const date = new Date(review.week_start).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Week of {date}</div>
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="size-3.5 text-champagne" />
          <span className="font-mono tabular-nums">{review.discipline_rating}/10</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Field label="Biggest mistake" value={review.biggest_mistake} />
        <Field label="Did well" value={review.did_well} />
        <Field label="Most broken rule" value={review.broken_rule} />
        <Field label="Will do differently" value={review.do_differently} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-faint mb-1">{label}</div>
      <div className="text-foreground/90 leading-relaxed">{value || <span className="text-faint">—</span>}</div>
    </div>
  );
}