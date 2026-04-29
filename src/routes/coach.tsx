import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTrades } from "@/hooks/use-trades";
import { buildTraderContext } from "@/lib/coach-context";
import { askVesper } from "@/server/coach.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Vesper — AI Trading Coach" },
      { name: "description", content: "Chat with Vesper, your AI trading coach." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <CoachPage />
      </AppShell>
    </RouteGate>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's my biggest weakness right now?",
  "Analyze my last 10 trades.",
  "Which session should I trade more?",
  "Am I overtrading?",
];

function CoachPage() {
  const { trades } = useTrades();
  const ask = useServerFn(askVesper);
  const context = useMemo(() => buildTraderContext(trades), [trades]);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm **Vesper**. I've reviewed your journal. Ask me anything — I'll give it to you straight, based on your real data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { context, messages: next, mode: "chat" } });
      setMessages([
        ...next,
        { role: "assistant", content: res.error ? `⚠️ ${res.error}` : res.reply || "(no response)" },
      ]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "⚠️ Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 md:px-10 py-8 max-w-[900px] mx-auto flex flex-col h-[calc(100dvh-4rem)] md:h-dvh">
      <header className="flex items-center gap-3 border-b border-border pb-5 mb-5">
        <div className="size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
          <Brain className="size-5 text-champagne" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vesper</h1>
          <div className="text-xs text-soft flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-pos animate-pulse" />
            AI Trading Coach · uses your real journal data
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={"flex gap-3 " + (m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
                  <Brain className="size-4 text-champagne" />
                </div>
              )}
              <div
                className={
                  "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed " +
                  (m.role === "user"
                    ? "bg-champagne text-primary-foreground"
                    : "bg-surface-2/60 border border-border text-foreground")
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <div className="size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
              <Brain className="size-4 text-champagne animate-pulse" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-surface-2/60 border border-border text-sm text-soft">
              Vesper is thinking…
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2/40 text-soft hover:text-foreground hover:border-champagne/40 transition-colors"
            >
              <Sparkles className="size-3 inline mr-1 text-champagne" />
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Vesper about your trading…"
          disabled={loading}
          className="bg-surface-2/40"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-1.5"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}