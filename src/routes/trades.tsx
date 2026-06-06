import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useTrades } from "@/hooks/use-trades";
import { fmtMoney, PAIRS, SESSIONS, type Trade } from "@/lib/trade-utils";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/trades")({
  head: () => ({
    meta: [
      { title: "Trade history — Vesper Journal" },
      { name: "description", content: "All your logged trades, filterable and searchable." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <TradesList />
      </AppShell>
    </RouteGate>
  ),
});

const ALL = "__all";

function TradesList() {
  const { trades, loading } = useTrades();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [pairF, setPairF] = useState<string>(ALL);
  const [sessionF, setSessionF] = useState<string>(ALL);
  const [resultF, setResultF] = useState<string>(ALL);
  const [selected, setSelected] = useState<Trade | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setScreenshotUrl(null);
    const raw = selected?.screenshot_url;
    if (!raw) return;
    // Backward compat: older rows stored a full URL. New rows store only the
    // object path — resolve to a short-lived signed URL on demand.
    if (/^https?:\/\//i.test(raw)) {
      setScreenshotUrl(raw);
      return;
    }
    (async () => {
      const { data } = await supabase.storage
        .from("screenshots")
        .createSignedUrl(raw, 60 * 15);
      if (!cancelled) setScreenshotUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.screenshot_url]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (pairF !== ALL && t.pair !== pairF) return false;
      if (sessionF !== ALL && t.session !== sessionF) return false;
      if (resultF !== ALL && t.result !== resultF) return false;
      if (q && !`${t.pair} ${t.strategy ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [trades, q, pairF, sessionF, resultF]);

  async function deleteTrade(id: string) {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Trade deleted.");
    setSelected(null);
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-soft mb-2">Journal</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Trade history</h1>
        </div>
        <Link to="/trade/new">
          <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11">
            <PlusCircle className="size-4" /> Log a trade
          </Button>
        </Link>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pair, strategy, notes…"
            className="bg-surface border-border h-10 pl-9"
          />
        </div>
        <Select value={pairF} onValueChange={setPairF}>
          <SelectTrigger className="bg-surface border-border h-10"><SelectValue placeholder="Pair" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All pairs</SelectItem>
            {PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sessionF} onValueChange={setSessionF}>
          <SelectTrigger className="bg-surface border-border h-10"><SelectValue placeholder="Session" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sessions</SelectItem>
            {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={resultF} onValueChange={setResultF}>
          <SelectTrigger className="bg-surface border-border h-10"><SelectValue placeholder="Result" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All results</SelectItem>
            <SelectItem value="win">Wins</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-faint border-b border-border">
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Pair</th>
                <th className="text-left font-medium px-5 py-3">Side</th>
                <th className="text-right font-medium px-5 py-3">Lot</th>
                <th className="text-right font-medium px-5 py-3">Entry</th>
                <th className="text-right font-medium px-5 py-3">Close</th>
                <th className="text-right font-medium px-5 py-3">R:R</th>
                <th className="text-right font-medium px-5 py-3">P&L</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-soft">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-soft">No trades match your filters.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)}
                  className="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer transition-colors">
                  <td className="px-5 py-3 text-soft font-mono text-xs">{new Date(t.trade_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-medium">{t.pair}</td>
                  <td className="px-5 py-3 uppercase text-xs">
                    <span className={cn("px-2 py-0.5 rounded-md", t.direction === "buy" ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg")}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-soft">{t.lot_size}</td>
                  <td className="px-5 py-3 text-right font-mono text-soft">{t.entry_price}</td>
                  <td className="px-5 py-3 text-right font-mono text-soft">{t.close_price ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-soft">{t.rr?.toFixed(2) ?? "—"}</td>
                  <td className={cn("px-5 py-3 text-right font-mono font-medium",
                    (t.pnl ?? 0) > 0 ? "text-pos" : (t.pnl ?? 0) < 0 ? "text-neg" : "text-soft")}>
                    {fmtMoney(t.pnl, { sign: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="surface-card-elevated top-accent max-w-xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-soft">Trade detail</div>
                <h3 className="text-2xl font-semibold tracking-tight mt-1">{selected.pair} <span className="text-soft text-base uppercase">{selected.direction}</span></h3>
                <div className="text-xs text-faint mt-1 font-mono">{new Date(selected.trade_date).toLocaleString()}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>✕</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <Stat label="P&L" value={fmtMoney(selected.pnl, { sign: true })} tone={(selected.pnl ?? 0) >= 0 ? "pos" : "neg"} />
              <Stat label="R:R" value={selected.rr?.toFixed(2) ?? "—"} />
              <Stat label="Entry" value={String(selected.entry_price)} />
              <Stat label="Close" value={selected.close_price?.toString() ?? "—"} />
              <Stat label="Stop" value={selected.stop_loss?.toString() ?? "—"} />
              <Stat label="TP" value={selected.take_profit?.toString() ?? "—"} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <Meta label="Session" value={selected.session ?? "—"} />
              <Meta label="Strategy" value={selected.strategy ?? "—"} />
              <Meta label="Emotion before" value={selected.emotion_before ?? "—"} />
              <Meta label="Emotion after" value={selected.emotion_after ?? "—"} />
            </div>

            {selected.mistakes && selected.mistakes.length > 0 && (
              <div className="mb-5">
                <div className="text-xs uppercase tracking-wider text-faint mb-2">Mistakes</div>
                <div className="flex flex-wrap gap-2">
                  {selected.mistakes.map((m) => (
                    <span key={m} className="px-2.5 py-1 rounded-full bg-neg/10 text-neg text-xs">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="mb-5">
                <div className="text-xs uppercase tracking-wider text-faint mb-2">Notes</div>
                <p className="text-sm text-soft leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {selected.screenshot_url && screenshotUrl && (
              <a href={screenshotUrl} target="_blank" rel="noreferrer" className="block mb-5">
                <img src={screenshotUrl} alt="Trade screenshot" className="rounded-lg border border-border w-full" />
              </a>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2"
                onClick={() => navigate({ to: "/trade/new", search: { id: selected.id } })}
              >
                <Pencil className="size-4" /> Edit trade
              </Button>
              <Button variant="ghost" className="text-neg hover:bg-neg/10 hover:text-neg gap-2"
                onClick={() => deleteTrade(selected.id)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "pos" | "neg" | "neutral" }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn("font-mono text-lg tabular-nums mt-1",
        tone === "pos" && "text-pos", tone === "neg" && "text-neg")}>{value}</div>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-2">
      <span className="text-xs text-faint uppercase tracking-wider">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}