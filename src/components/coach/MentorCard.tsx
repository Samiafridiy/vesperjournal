import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Trade } from "@/lib/trade-utils";
import { detectMentorEvent, dismiss, isDismissed } from "@/lib/mentor-events";
import { askMentor } from "@/lib/mentor.functions";

type MentorReply = {
  observation: string;
  question: string;
  insight: string;
  action: string;
};

export function MentorCard({ trades }: { trades: Trade[] }) {
  const event = useMemo(() => detectMentorEvent(trades), [trades]);
  const ask = useServerFn(askMentor);

  const [dismissed, setDismissed] = useState(() => (event ? isDismissed(event.signature) : true));
  const [reflection, setReflection] = useState("");
  const [stage, setStage] = useState<"observe" | "thinking" | "insight">("observe");
  const [reply, setReply] = useState<MentorReply | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!event || dismissed) return null;

  const fetchReply = async (withReflection: boolean) => {
    setStage("thinking");
    setError(null);
    const res = await ask({
      data: {
        eventKey: event.key,
        observation: event.observation,
        reflection: withReflection ? reflection.trim() || undefined : undefined,
      },
    });
    if (res.error || !res.result) {
      setError(res.error ?? "Something went wrong.");
      setStage("observe");
      return;
    }
    setReply(res.result);
    setStage("insight");
  };

  const close = () => {
    dismiss(event.signature);
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface-card-elevated top-accent p-5 md:p-6 mb-6 relative overflow-hidden"
    >
      <button
        onClick={close}
        aria-label="Dismiss mentor"
        className="absolute top-3 right-3 text-faint hover:text-foreground transition-colors"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div
          className={
            "size-7 rounded-md flex items-center justify-center " +
            (event.tone === "good"
              ? "bg-pos/10 border border-pos/30"
              : "bg-champagne/10 border border-champagne/30")
          }
        >
          <Brain className={"size-4 " + (event.tone === "good" ? "text-pos" : "text-champagne")} />
        </div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
          Vesper Mentor
        </span>
      </div>

      {/* Observation */}
      <div className="text-sm text-foreground leading-relaxed">
        <span className="text-faint mr-2">Observation —</span>
        {reply?.observation ?? event.observation}
      </div>

      <AnimatePresence mode="wait">
        {stage === "observe" && (
          <motion.div
            key="observe"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="text-sm text-soft mb-2">
              <span className="text-faint mr-2">Reflect —</span>
              Was this planned or emotional? (optional)
            </div>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="A short, honest answer helps the coaching be specific."
              className="bg-surface border-border resize-none min-h-[72px] text-sm"
              maxLength={400}
            />
            {error && <p className="text-xs text-neg mt-2">{error}</p>}
            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={() => fetchReply(true)}
                className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-9 gap-2"
              >
                <Sparkles className="size-3.5" /> Get coaching
              </Button>
              <Button
                variant="ghost"
                onClick={() => fetchReply(false)}
                className="h-9 text-soft"
              >
                Skip reflection
              </Button>
            </div>
          </motion.div>
        )}

        {stage === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-xs text-soft flex items-center gap-2"
          >
            <span className="size-1.5 rounded-full bg-champagne animate-pulse" />
            Vesper is thinking…
          </motion.div>
        )}

        {stage === "insight" && reply && (
          <motion.div
            key="insight"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3"
          >
            {reply.question && (
              <div className="text-sm text-soft leading-relaxed">
                <span className="text-faint mr-2">Question —</span>
                {reply.question}
              </div>
            )}
            {reply.insight && (
              <div className="text-sm text-foreground leading-relaxed">
                <span className="text-faint mr-2">Insight —</span>
                {reply.insight}
              </div>
            )}
            {reply.action && (
              <div className="rounded-lg border border-champagne/30 bg-champagne/5 p-3.5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-champagne mb-1">
                  Your one rule
                </div>
                <div className="text-sm text-foreground font-medium">{reply.action}</div>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" onClick={close} className="h-8 text-soft text-xs">
                Got it
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}