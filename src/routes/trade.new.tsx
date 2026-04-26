import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  PAIRS,
  SESSIONS,
  EMOTIONS_BEFORE,
  EMOTIONS_AFTER,
  MISTAKES,
  calcPnl,
  calcRR,
  calcResult,
  fmtMoney,
} from "@/lib/trade-utils";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trade/new")({
  head: () => ({
    meta: [
      { title: "New trade — Aegis" },
      { name: "description", content: "Log a new trade with psychology tracking." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <NewTrade />
      </AppShell>
    </RouteGate>
  ),
});

function NewTrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [lot, setLot] = useState("0.10");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [tp, setTp] = useState("");
  const [close, setClose] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [session, setSession] = useState<string | undefined>("London");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [emotionBefore, setEmotionBefore] = useState<string | undefined>("Neutral");
  const [emotionAfter, setEmotionAfter] = useState<string | undefined>(undefined);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Live preview
  const entryN = parseFloat(entry);
  const closeN = close === "" ? null : parseFloat(close);
  const lotN = parseFloat(lot);
  const stopN = stop === "" ? null : parseFloat(stop);
  const tpN = tp === "" ? null : parseFloat(tp);
  const previewPnl = !isNaN(entryN) && !isNaN(lotN)
    ? calcPnl({ pair, direction, entry: entryN, close: closeN, lot: lotN })
    : null;
  const previewRR = !isNaN(entryN)
    ? calcRR({ direction, entry: entryN, stop: stopN, takeProfit: tpN, close: closeN })
    : null;

  function toggleMistake(m: string) {
    setMistakes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (isNaN(entryN) || isNaN(lotN)) {
      toast.error("Entry and lot size are required.");
      return;
    }
    setSubmitting(true);

    const pnl = calcPnl({ pair, direction, entry: entryN, close: closeN, lot: lotN });
    const rr = calcRR({ direction, entry: entryN, stop: stopN, takeProfit: tpN, close: closeN });
    const result = calcResult(pnl);

    let screenshot_url: string | null = null;
    if (screenshot) {
      const ext = screenshot.name.split(".").pop() ?? "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("screenshots").upload(path, screenshot);
      if (upErr) {
        toast.error("Screenshot upload failed: " + upErr.message);
      } else {
        const { data } = await supabase.storage.from("screenshots").createSignedUrl(path, 60 * 60 * 24 * 365);
        screenshot_url = data?.signedUrl ?? path;
      }
    }

    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      pair,
      direction,
      lot_size: lotN,
      entry_price: entryN,
      stop_loss: stopN,
      take_profit: tpN,
      close_price: closeN,
      trade_date: new Date(date).toISOString(),
      session: session ?? null,
      strategy: strategy || null,
      notes: notes || null,
      screenshot_url,
      emotion_before: emotionBefore ?? null,
      emotion_after: emotionAfter ?? null,
      mistakes,
      pnl,
      rr,
      result,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trade logged.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1200px] mx-auto">
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="flex items-center gap-2 text-sm text-soft hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <header className="border-b border-border pb-6 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft mb-2">New entry</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Log a trade</h1>
        <p className="text-soft mt-2">P&L, R:R, and result are auto-calculated.</p>
      </header>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trade details */}
        <section className="lg:col-span-2 surface-card p-6 md:p-8 flex flex-col gap-6">
          <SectionTitle>Trade</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField label="Pair">
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger className="bg-surface-2 border-border h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Direction">
              <div className="flex gap-2 h-11">
                <button type="button" onClick={() => setDirection("buy")}
                  className={cn("flex-1 rounded-md text-sm font-medium border transition-colors",
                    direction === "buy" ? "bg-pos/15 border-pos/40 text-pos" : "border-border text-soft hover:bg-accent")}>
                  Buy
                </button>
                <button type="button" onClick={() => setDirection("sell")}
                  className={cn("flex-1 rounded-md text-sm font-medium border transition-colors",
                    direction === "sell" ? "bg-neg/15 border-neg/40 text-neg" : "border-border text-soft hover:bg-accent")}>
                  Sell
                </button>
              </div>
            </FormField>
            <FormField label="Lot size">
              <Input type="number" step="0.01" value={lot} onChange={(e) => setLot(e.target.value)} className="bg-surface-2 border-border h-11 font-mono" />
            </FormField>

            <FormField label="Entry price">
              <Input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} required className="bg-surface-2 border-border h-11 font-mono" />
            </FormField>
            <FormField label="Stop loss">
              <Input type="number" step="any" value={stop} onChange={(e) => setStop(e.target.value)} className="bg-surface-2 border-border h-11 font-mono" />
            </FormField>
            <FormField label="Take profit">
              <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} className="bg-surface-2 border-border h-11 font-mono" />
            </FormField>

            <FormField label="Close price">
              <Input type="number" step="any" value={close} onChange={(e) => setClose(e.target.value)} placeholder="Leave blank if open" className="bg-surface-2 border-border h-11 font-mono" />
            </FormField>
            <FormField label="Date & time">
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-surface-2 border-border h-11" />
            </FormField>
            <FormField label="Session">
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger className="bg-surface-2 border-border h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Strategy tag">
              <Input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="e.g. Breakout, ICT, Liquidity sweep" className="bg-surface-2 border-border h-11" />
            </FormField>
            <FormField label="Screenshot">
              <label className="flex items-center gap-3 h-11 px-3 rounded-md border border-dashed border-border bg-surface-2 cursor-pointer hover:bg-accent text-sm text-soft">
                <Upload className="size-4" />
                <span className="truncate">{screenshot?.name ?? "Upload chart screenshot"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} />
              </label>
            </FormField>
          </div>

          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did you see? What was the setup?" className="bg-surface-2 border-border resize-none" />
          </FormField>

          <SectionTitle>Psychology</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Emotion before">
              <PillGroup options={EMOTIONS_BEFORE as readonly string[]} value={emotionBefore} onChange={setEmotionBefore} />
            </FormField>
            <FormField label="Emotion after">
              <PillGroup options={EMOTIONS_AFTER as readonly string[]} value={emotionAfter} onChange={setEmotionAfter} />
            </FormField>
          </div>

          <FormField label="Mistakes (multi-select)">
            <div className="flex flex-wrap gap-2">
              {MISTAKES.map((m) => (
                <button key={m} type="button" onClick={() => toggleMistake(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    mistakes.includes(m)
                      ? "bg-neg/15 border-neg/40 text-neg"
                      : "border-border text-soft hover:bg-accent",
                  )}>
                  {m}
                </button>
              ))}
            </div>
          </FormField>
        </section>

        {/* Live preview */}
        <aside className="surface-card-elevated top-accent p-6 h-fit lg:sticky lg:top-6 flex flex-col gap-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-champagne font-medium">
            Live calculation
          </div>
          <PreviewRow
            label="Estimated P&L"
            value={previewPnl == null ? "—" : fmtMoney(previewPnl, { sign: true })}
            tone={previewPnl == null ? "neutral" : previewPnl >= 0 ? "pos" : "neg"}
          />
          <PreviewRow
            label="Risk : Reward"
            value={previewRR == null ? "—" : `${previewRR.toFixed(2)} R`}
          />
          <PreviewRow
            label="Result"
            value={
              previewPnl == null
                ? "Open"
                : previewPnl > 0
                ? "Win"
                : previewPnl < 0
                ? "Loss"
                : "Breakeven"
            }
            tone={previewPnl == null ? "neutral" : previewPnl >= 0 ? "pos" : "neg"}
          />

          <Button type="submit" disabled={submitting}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 h-11 mt-2">
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save trade
          </Button>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium border-b border-border pb-2">
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-[0.1em] text-faint">{label}</Label>
      {children}
    </div>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            value === o
              ? "bg-champagne/15 border-champagne/40 text-champagne"
              : "border-border text-soft hover:bg-accent",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-3 last:border-0">
      <span className="text-xs text-soft uppercase tracking-wider">{label}</span>
      <span
        className={cn(
          "font-mono text-lg tabular-nums",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
        )}
      >
        {value}
      </span>
    </div>
  );
}