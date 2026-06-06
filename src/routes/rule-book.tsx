import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { useRules } from "@/hooks/use-rules";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { parseRule, ruleSummary } from "@/lib/rule-engine";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/rule-book")({
  head: () => ({
    meta: [
      { title: "Rule Book — Vesper Journal" },
      { name: "description", content: "Your personal trading rules. Every trade is checked against them." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <RuleBook />
      </AppShell>
    </RouteGate>
  ),
});

const EXAMPLES = [
  "Max 3 trades per day",
  "No trading after 2 losses in a day",
  "Wait 30 minutes after a loss",
  "Only trade London and New York sessions",
  "No trades on Friday after 3pm",
];

function RuleBook() {
  const { user } = useAuth();
  const { rules, loading } = useRules();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function addRule(text: string) {
    if (!user) return;
    const value = text.trim();
    if (!value) return;
    if (value.length > 280) {
      toast.error("Rule must be 280 characters or fewer.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("trading_rules").insert({
      user_id: user.id,
      text: value,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
    toast.success("Rule added");
  }

  async function toggleRule(id: string, active: boolean) {
    const { error } = await supabase.from("trading_rules").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from("trading_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1100px] mx-auto">
      <header className="border-b border-border pb-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-soft">Lab</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Rule Book</h1>
        <p className="text-soft mt-2 max-w-2xl">
          Your trading rules in plain language. Every new trade is checked against them — violations
          show up in Analytics and on your Overview.
        </p>
      </header>

      {/* Add new rule */}
      <section className="surface-card p-6 mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium mb-3">
          Add a rule
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Max 3 trades per day"
          rows={2}
          maxLength={280}
          className="bg-surface-2 border-border resize-none"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="text-[11px] text-faint">{draft.length}/280</div>
          <Button
            onClick={() => addRule(draft)}
            disabled={saving || draft.trim().length === 0}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2"
          >
            <Plus className="size-4" /> Add rule
          </Button>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium mb-3">
            Quick examples
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => addRule(ex)}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-surface-2 text-soft hover:text-foreground hover:border-champagne/40 transition-colors"
              >
                + {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Existing rules */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">
            Your rules ({rules.length})
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-8 text-center text-soft text-sm">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="surface-card p-8 text-center text-soft text-sm">
            No rules yet. Add one above to start tracking violations.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {rules.map((r) => {
                const parsed = parseRule(r.text);
                const isManual = parsed.kind === "manual";
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="surface-card p-4 flex items-start gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRule(r.id, !r.active)}
                      aria-label={r.active ? "Deactivate" : "Activate"}
                      className={
                        "size-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors " +
                        (r.active
                          ? "bg-champagne/15 border-champagne/40 text-champagne"
                          : "border-border text-faint hover:text-soft")
                      }
                    >
                      {r.active && <Check className="size-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={"text-sm " + (r.active ? "text-foreground" : "text-faint line-through")}>
                        {r.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                        {isManual ? (
                          <span className="inline-flex items-center gap-1 text-faint">
                            <AlertTriangle className="size-3" /> Manual only — auto-check not supported
                          </span>
                        ) : (
                          <span className="text-soft">Auto-checked: {ruleSummary(parsed)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(r.id)}
                      className="text-faint hover:text-neg hover:bg-neg/10"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}