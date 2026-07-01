import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTrades } from "@/hooks/use-trades";
import { buildTraderContext, PRESET_INSTRUCTIONS } from "@/lib/coach-context";
import { askVesper } from "@/lib/coach.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, Sparkles, Plus, Menu, MessageSquare, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function parseAssistant(content: string): {
  body: string;
  bars: { label: string; value: number }[] | null;
  followups: string[];
} {
  let body = content;
  let followups: string[] = [];
  const fu = body.match(/<followups>([\s\S]*?)<\/followups>/i);
  if (fu) {
    followups = fu[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    body = body.replace(fu[0], "").trim();
  }
  let bars: { label: string; value: number }[] | null = null;
  const bm = body.match(/```bars\s*\n([\s\S]*?)```/i);
  if (bm) {
    const rows = bm[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label, val] = l.split("|");
        return { label: (label ?? "").trim(), value: Number((val ?? "0").trim()) };
      })
      .filter((r) => r.label && Number.isFinite(r.value));
    if (rows.length) bars = rows;
    body = body.replace(bm[0], "").trim();
  }
  return { body, bars, followups };
}

function formatBarValue(v: number, allInts: boolean) {
  const abs = Math.abs(v);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  // Heuristic: values that look like currency (>=1 and not all small integers) get $ prefix
  if (allInts && abs < 100) return `${sign}${abs}`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function InlineBars({ data, bodyText }: { data: { label: string; value: number }[]; bodyText: string }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const allInts = data.every((d) => Number.isInteger(d.value) && Math.abs(d.value) <= 100);

  // Auto-highlight: best positive + worst negative when both exist; otherwise the single extreme.
  const bestIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const worstIdx = data.reduce((worst, d, i) => (d.value < data[worst].value ? i : worst), 0);
  const highlight = new Set<number>();
  if (data[bestIdx].value > 0) highlight.add(bestIdx);
  if (data[worstIdx].value < 0) highlight.add(worstIdx);

  // Also highlight any category the assistant explicitly names as strongest/weakest/best/worst.
  const lower = bodyText.toLowerCase();
  data.forEach((d, i) => {
    const l = d.label.toLowerCase();
    if (!l) return;
    const mentioned = lower.includes(l);
    if (mentioned && /(strongest|weakest|best|worst|top|bottom|edge|bleeding)/.test(lower)) {
      highlight.add(i);
    }
  });

  return (
    <div className="not-prose my-3 rounded-xl bg-surface/70 border border-border p-3">
      <div className="flex flex-col gap-2">
        {data.map((d, i) => {
          const pct = (Math.abs(d.value) / max) * 100;
          const pos = d.value >= 0;
          const hl = highlight.has(i);
          return (
            <div
              key={d.label + i}
              className={cn(
                "grid grid-cols-[80px_1fr_78px] items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
                hl && "ring-1 ring-champagne/40 bg-champagne/[0.04]",
              )}
            >
              <div className={cn("text-[11px] truncate", hl ? "text-champagne" : "text-soft")}>
                {d.label}
              </div>
              <div className="h-[7px] rounded-full bg-surface-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background: pos ? "var(--pos)" : "var(--neg)",
                    boxShadow: hl
                      ? `0 0 8px 0 ${pos ? "rgb(from var(--pos) r g b / 0.5)" : "rgb(from var(--neg) r g b / 0.5)"}`
                      : undefined,
                  }}
                />
              </div>
              <div
                className={cn(
                  "font-mono text-[11px] tabular-nums text-right",
                  pos ? "text-pos" : "text-neg",
                )}
              >
                {formatBarValue(d.value, allInts)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
type Conv = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  "What's my biggest weakness right now?",
  "Analyze my last 10 trades.",
  "Which session should I trade more?",
  "Am I overtrading?",
  "What's the difference between my winning and losing trades?",
  "How do I replicate my best month?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "I'm **Vesper**. I've reviewed your journal. Ask me anything — I'll give it to you straight, based on your real data.",
};

function CoachPage() {
  const { trades } = useTrades();
  const { user } = useAuth();
  const ask = useServerFn(askVesper);
  const context = useMemo(() => buildTraderContext(trades), [trades]);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    setConversations((data as Conv[]) ?? []);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function openConversation(id: string) {
    setActiveId(id);
    setHistoryOpen(false);
    const { data } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    const msgs = (data as Msg[]) ?? [];
    setMessages(msgs.length ? msgs : [WELCOME]);
  }

  function newChat() {
    setActiveId(null);
    setMessages([WELCOME]);
    setHistoryOpen(false);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this chat?")) return;
    const { error } = await supabase.from("coach_conversations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeId === id) newChat();
    loadConversations();
  }

  async function ensureConversation(firstUserText: string): Promise<string | null> {
    if (!user) return null;
    if (activeId) return activeId;
    const title = firstUserText.slice(0, 50) + (firstUserText.length > 50 ? "…" : "");
    const dateLabel = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const { data, error } = await supabase
      .from("coach_conversations")
      .insert({ user_id: user.id, title: `${title} - ${dateLabel}` })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return null; }
    setActiveId(data.id);
    loadConversations();
    return data.id;
  }

  async function persistMessage(convId: string, msg: Msg) {
    if (!user) return;
    await supabase.from("coach_messages").insert({
      conversation_id: convId, user_id: user.id, role: msg.role, content: msg.content,
    });
    await supabase.from("coach_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    const convId = await ensureConversation(trimmed);
    if (convId) await persistMessage(convId, userMsg);
    try {
      const extraSystem = PRESET_INSTRUCTIONS[trimmed];
      const res = await ask({ data: { context, messages: next, mode: "chat", extraSystem } });
      const reply: Msg = {
        role: "assistant",
        content: res.error ? `⚠️ ${res.error}` : res.reply || "(no response)",
      };
      setMessages([...next, reply]);
      if (convId && !res.error) await persistMessage(convId, reply);
      loadConversations();
    } catch {
      setMessages([...next, { role: "assistant", content: "⚠️ Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-dvh max-w-[1400px] mx-auto">
      {/* History sidebar — desktop */}
      <HistorySidebar
        className="hidden md:flex w-64 shrink-0"
        conversations={conversations}
        activeId={activeId}
        onOpen={openConversation}
        onNew={newChat}
        onDelete={deleteConversation}
      />

      {/* History drawer — mobile */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="md:hidden fixed left-0 top-14 bottom-0 w-72 z-50 bg-sidebar border-r border-border"
            >
              <HistorySidebar
                className="flex w-full"
                conversations={conversations}
                activeId={activeId}
                onOpen={openConversation}
                onNew={newChat}
                onDelete={deleteConversation}
                onClose={() => setHistoryOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat */}
      <div className="flex-1 min-w-0 flex flex-col px-4 md:px-8 py-4 md:py-6">
        <header className="flex items-center gap-2 md:gap-3 border-b border-border pb-3 md:pb-5 mb-3 md:mb-5">
          <button
            className="md:hidden p-2 -ml-2 text-soft hover:text-foreground"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open chat history"
          >
            <Menu className="size-5" />
          </button>
          <div className="size-9 md:size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
            <Brain className="size-4 md:size-5 text-champagne" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-semibold tracking-tight">Vesper</h1>
            <div className="text-[10px] md:text-xs text-soft flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-pos animate-pulse" />
              <span className="truncate">AI Trading Coach · uses your real data</span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={newChat} className="gap-1.5 h-8 text-xs">
            <Plus className="size-3.5" /> <span className="hidden sm:inline">New chat</span>
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-1 px-1 flex flex-col gap-3 md:gap-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const parsed = m.role === "assistant" ? parseAssistant(m.content) : null;
              const isLastAssistant =
                m.role === "assistant" && i === messages.length - 1 && !loading;
              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={"flex gap-2 md:gap-3 " + (m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="size-7 md:size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
                    <Brain className="size-3.5 md:size-4 text-champagne" />
                  </div>
                )}
                <div
                  className={
                    "rounded-2xl px-3 md:px-4 py-2 md:py-2.5 max-w-[85%] md:max-w-[80%] text-[13px] md:text-sm leading-relaxed " +
                    (m.role === "user"
                      ? "bg-champagne text-primary-foreground"
                      : "bg-surface-2/60 border border-border text-foreground")
                  }
                >
                  {m.role === "assistant" && parsed ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{parsed.body}</ReactMarkdown>
                      {parsed.bars && <InlineBars data={parsed.bars} bodyText={parsed.body} />}
                      {isLastAssistant && parsed.followups.length > 0 && (
                        <div className="not-prose mt-3 flex flex-wrap gap-2">
                          {parsed.followups.map((q) => (
                            <button
                              key={q}
                              onClick={() => send(q)}
                              className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface/60 text-soft hover:text-foreground hover:border-champagne/40 transition-colors"
                            >
                              <Sparkles className="size-3 inline mr-1 text-champagne" />
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-2 md:gap-3">
              <div className="size-7 md:size-8 rounded-lg bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center">
                <Brain className="size-3.5 md:size-4 text-champagne animate-pulse" />
              </div>
              <div className="rounded-2xl px-3 md:px-4 py-2.5 md:py-3 bg-surface-2/60 border border-border text-xs md:text-sm text-soft">
                Vesper is thinking…
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-3 md:mt-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-2 rounded-full border border-border bg-surface-2/40 text-soft hover:text-foreground hover:border-champagne/40 transition-colors text-left sm:text-center"
              >
                <Sparkles className="size-3 inline mr-1 text-champagne" />
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-3 md:mt-4 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Vesper…"
            disabled={loading}
            className="bg-surface-2/40 h-11 text-base md:text-sm"
            inputMode="text"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 px-4"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function HistorySidebar({
  className, conversations, activeId, onOpen, onNew, onDelete, onClose,
}: {
  className?: string;
  conversations: Conv[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <aside className={cn("flex-col border-r border-border bg-sidebar/40", className)}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium">Chats</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onNew} className="h-7 px-2 gap-1 text-xs">
            <Plus className="size-3.5" /> New
          </Button>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 text-soft" aria-label="Close">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {conversations.length === 0 && (
          <div className="text-xs text-faint px-2 py-3">No chats yet. Start a new one!</div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-2 px-2 py-2 rounded-md text-xs cursor-pointer transition-colors",
              activeId === c.id ? "bg-accent text-foreground" : "text-soft hover:bg-accent/40 hover:text-foreground",
            )}
            onClick={() => onOpen(c.id)}
          >
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="flex-1 truncate">{c.title}</span>
            <button
              className="opacity-0 group-hover:opacity-100 text-faint hover:text-neg shrink-0"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}