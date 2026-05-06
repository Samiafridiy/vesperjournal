import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect, useMemo, type FormEvent, type ReactNode } from "react";
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
  SESSIONS,
  EMOTIONS_BEFORE,
  EMOTIONS_AFTER,
  MISTAKES,
  calcPnl,
  calcRR,
  calcResult,
  fmtMoney,
  absPips,
  pipDistance,
  pipSize,
  pipValuePerLot,
  fmtPct,
} from "@/lib/trade-utils";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft, AlertTriangle, BarChart3, Target, ChevronDown, Beaker, ArrowUp, ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useRiskPresets, useTradingAccounts, riskProfileLabel, suggestLotSize } from "@/hooks/use-risk";
import { useTrades } from "@/hooks/use-trades";
import { computeEdge } from "@/lib/edge-context";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { PairSelector, pushRecentPair } from "@/components/PairSelector";

export const Route = createFileRoute("/trade/new")({
  validateSearch: z.object({
    id: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "New trade — Vesper Journal" },
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
  const { id: editId } = Route.useSearch();
  const isEdit = Boolean(editId);
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(isEdit);
  const [existingScreenshot, setExistingScreenshot] = useState<string | null>(null);

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

  // Risk preset + accounts integration
  const { presets, defaultPreset } = useRiskPresets();
  const { accounts, defaultAccount } = useTradingAccounts();
  const { trades: allTrades } = useTrades();
  const [presetId, setPresetId] = useState<string | null>(null);
  const [autoTpApplied, setAutoTpApplied] = useState(false);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === presetId) ?? defaultPreset ?? null,
    [presets, presetId, defaultPreset],
  );
  const selectedAccount = useMemo(
    () =>
      accounts.find((a) => a.id === selectedPreset?.account_id)
        ?? defaultAccount
        ?? null,
    [accounts, selectedPreset, defaultAccount],
  );
  const accountBalance = Number(selectedAccount?.balance ?? 0);

  // Default the preset selector when the default preset loads (only if user hasn't picked one)
  useEffect(() => {
    if (presetId == null && defaultPreset) setPresetId(defaultPreset.id);
  }, [defaultPreset, presetId]);

  useEffect(() => {
    if (!isEdit || !editId || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("trades").select("*").eq("id", editId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Trade not found.");
        navigate({ to: "/trades" });
        return;
      }
      setPair(data.pair);
      setDirection(data.direction as "buy" | "sell");
      setLot(String(data.lot_size));
      setEntry(String(data.entry_price));
      setStop(data.stop_loss != null ? String(data.stop_loss) : "");
      setTp(data.take_profit != null ? String(data.take_profit) : "");
      setClose(data.close_price != null ? String(data.close_price) : "");
      setDate(new Date(data.trade_date).toISOString().slice(0, 16));
      setSession(data.session ?? undefined);
      setStrategy(data.strategy ?? "");
      setNotes(data.notes ?? "");
      setEmotionBefore(data.emotion_before ?? undefined);
      setEmotionAfter(data.emotion_after ?? undefined);
      setMistakes(data.mistakes ?? []);
      setExistingScreenshot(data.screenshot_url ?? null);
      if (data.risk_preset_id) setPresetId(data.risk_preset_id);
      setLoadingTrade(false);
    })();
    return () => { cancelled = true; };
  }, [isEdit, editId, user, navigate]);

  const entryN = parseFloat(entry);
  const closeN = close === "" ? null : parseFloat(close);
  const lotN = parseFloat(lot);
  const stopN = stop === "" ? null : parseFloat(stop);
  const tpN = tp === "" ? null : parseFloat(tp);
  const previewPnl = !isNaN(entryN) && !isNaN(lotN)
    ? calcPnl({ pair, direction, entry: entryN, close: closeN, lot: lotN })
    : null;
  const plannedRR = !isNaN(entryN)
    ? calcRR({ pair, direction, entry: entryN, stop: stopN, takeProfit: tpN })
    : null;
  const actualRR = !isNaN(entryN) && closeN != null
    ? calcRR({ pair, direction, entry: entryN, stop: stopN, close: closeN })
    : null;

  const riskPips = !isNaN(entryN) && stopN != null
    ? absPips(pair, entryN, stopN)
    : null;
  const rewardPips = !isNaN(entryN) && tpN != null
    ? absPips(pair, entryN, tpN)
    : null;
  const livePips = !isNaN(entryN) && closeN != null
    ? pipDistance({ pair, direction, from: entryN, to: closeN })
    : null;

  const { progress, nextStep } = useMemo(() => {
    const checks: Array<{ ok: boolean; hint: string }> = [
      { ok: !!pair, hint: "Enter a symbol" },
      { ok: !isNaN(entryN), hint: "Enter entry price" },
      { ok: !isNaN(lotN) && lotN > 0, hint: "Set lot size" },
      { ok: stopN != null && !isNaN(stopN), hint: "Add a stop loss" },
      { ok: tpN != null && !isNaN(tpN), hint: "Add a take profit" },
      { ok: !!strategy || !!notes, hint: "Add a strategy tag or note" },
    ];
    const done = checks.filter((c) => c.ok).length;
    const pct = Math.round((done / checks.length) * 100);
    const next = checks.find((c) => !c.ok)?.hint ?? "Ready to save";
    return { progress: pct, nextStep: next };
  }, [pair, entryN, lotN, stopN, tpN, strategy, notes]);

  const maxLoss = !isNaN(entryN) && !isNaN(lotN) && stopN != null
    ? calcPnl({ pair, direction, entry: entryN, close: stopN, lot: lotN })
    : null;
  const maxProfit = !isNaN(entryN) && !isNaN(lotN) && tpN != null
    ? calcPnl({ pair, direction, entry: entryN, close: tpN, lot: lotN })
    : null;

  // Preset-based risk computations
  const presetRiskPct = selectedPreset ? Number(selectedPreset.risk_pct) : null;
  const presetRR = selectedPreset?.rr_ratio ? Number(selectedPreset.rr_ratio) : null;
  const presetMaxLoss = presetRiskPct != null && accountBalance > 0
    ? -accountBalance * (presetRiskPct / 100)
    : null;
  const presetMaxProfit = presetMaxLoss != null && presetRR != null
    ? Math.abs(presetMaxLoss) * presetRR
    : null;
  const profileBadge = presetRiskPct != null ? riskProfileLabel(presetRiskPct) : null;

  // Suggested lot from preset
  const suggestedLot = useMemo(() => {
    if (!selectedPreset || !stopN || isNaN(entryN) || accountBalance <= 0) return null;
    const stopPips = absPips(pair, entryN, stopN);
    if (stopPips <= 0) return null;
    return suggestLotSize({
      balance: accountBalance,
      riskPct: Number(selectedPreset.risk_pct),
      stopPips,
      pipValuePerLot: pipValuePerLot(pair),
    });
  }, [selectedPreset, stopN, entryN, accountBalance, pair]);

  // Auto-fill TP from preset R:R when user sets entry+stop and TP is empty
  useEffect(() => {
    if (!presetRR || tp !== "" || isNaN(entryN) || stopN == null || autoTpApplied) return;
    const stopDist = Math.abs(entryN - stopN);
    if (stopDist <= 0) return;
    const targetPrice = direction === "buy"
      ? entryN + stopDist * presetRR
      : entryN - stopDist * presetRR;
    setTp(targetPrice.toFixed(pipSize(pair) >= 1 ? 2 : 5));
    setAutoTpApplied(true);
  }, [presetRR, entryN, stopN, direction, pair, tp, autoTpApplied]);

  // Edge context for this pair + session (90 days)
  const edge = useMemo(
    () => computeEdge(allTrades, pair, session ?? null),
    [allTrades, pair, session],
  );

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
    const rr = calcRR({ pair, direction, entry: entryN, stop: stopN, takeProfit: tpN, close: closeN });
    const result = calcResult(pnl);

    let screenshot_url: string | null = existingScreenshot;
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

    const payload = {
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
      risk_preset_id: selectedPreset?.id ?? null,
      account_id: selectedAccount?.id ?? null,
    };

    const { error } = isEdit && editId
      ? await supabase.from("trades").update(payload).eq("id", editId)
      : await supabase.from("trades").insert({ ...payload, user_id: user.id });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Trade updated successfully" : "Trade logged.");
    pushRecentPair(pair);
    setSavedFlash(true);
    setTimeout(() => navigate({ to: isEdit ? "/trades" : "/dashboard" }), 700);
  }

  if (loadingTrade) {
    return (
      <div className="px-5 md:px-10 py-20 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-champagne" />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto tl-bg relative">
      {savedFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="tl-success-flash size-20 rounded-full bg-pos/20 border border-pos/60 flex items-center justify-center">
            <Check className="size-10 text-pos" strokeWidth={3} />
          </div>
        </div>
      )}
      <button
        onClick={() => navigate({ to: isEdit ? "/trades" : "/dashboard" })}
        className="flex items-center gap-2 text-sm text-soft hover:text-foreground transition-colors mb-6 tl-fade-up"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <header className="border-b border-border pb-6 mb-8 tl-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft mb-2">
          {isEdit ? "Edit entry" : "New entry"}
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {isEdit ? "Edit trade" : "Log a trade"}
        </h1>
        <p className="text-soft mt-2">P&L, R:R, and result are auto-calculated.</p>
      </header>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <section className="surface-card p-6 md:p-8 flex flex-col gap-6 tl-fade-up" style={{ animationDelay: "0.1s" }}>
          <SectionTitle>Trade</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField label="Pair">
              <PairSelector value={pair} onChange={setPair} />
            </FormField>
            <FormField label="Direction">
              <div className="flex gap-2 h-11">
                <button type="button" onClick={() => setDirection("buy")}
                  className={cn("flex-1 rounded-md text-sm font-medium border transition-all duration-200",
                    direction === "buy" ? "bg-pos/15 border-pos/40 text-pos tl-pulse-pos" : "border-border text-soft hover:bg-accent")}>
                  Buy
                </button>
                <button type="button" onClick={() => setDirection("sell")}
                  className={cn("flex-1 rounded-md text-sm font-medium border transition-all duration-200",
                    direction === "sell" ? "bg-neg/15 border-neg/40 text-neg tl-pulse-neg" : "border-border text-soft hover:bg-accent")}>
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
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-2 border-border h-11 w-full min-w-0 text-xs sm:text-sm font-mono px-2 sm:px-3"
              />
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
                <span className="truncate">
                  {screenshot?.name ?? (existingScreenshot ? "Replace screenshot" : "Upload chart screenshot")}
                </span>
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

        <aside className="flex flex-col gap-5 h-fit lg:sticky lg:top-6">
          <div className="surface-card p-5 flex flex-col gap-4">
            <div className="text-sm font-semibold">Trade Progress</div>
            <div>
              <div className="flex items-center justify-between text-xs text-soft mb-2">
                <span>Progress</span>
                <span className="font-mono text-champagne">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-champagne transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-champagne/40 bg-champagne/5 p-3 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-champagne mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-champagne">Next Step</div>
                <div className="text-xs text-soft mt-0.5">{nextStep}</div>
              </div>
            </div>
          </div>

          <div className="surface-card p-5 flex flex-col gap-3">
            <div className="text-sm font-semibold">Trade Summary</div>
            <SummaryRow label="Symbol" value={pair || "—"} />
            <SummaryRow label="Entry" value={isNaN(entryN) ? "—" : String(entryN)} mono />
            <SummaryRow label="Size" value={isNaN(lotN) ? "—" : `${lotN} lot`} mono />
            <SummaryRow
              label="Pips"
              value={livePips == null ? "—" : `${livePips >= 0 ? "+" : ""}${livePips.toFixed(1)} pips`}
              tone={livePips == null ? undefined : livePips >= 0 ? "pos" : "neg"}
              mono
            />
            <SummaryRow
              label="P&L"
              value={previewPnl == null ? "—" : fmtMoney(previewPnl, { sign: true })}
              tone={previewPnl == null ? undefined : previewPnl >= 0 ? "pos" : "neg"}
              mono
            />
            <div className="h-px bg-border my-1" />
            <SummaryRow
              label="Risk / Reward (pips)"
              value={
                riskPips != null && rewardPips != null
                  ? `${riskPips.toFixed(1)} / ${rewardPips.toFixed(1)}`
                  : "—"
              }
              mono
            />
            <SummaryRow
              label={<><Target className="size-3 inline mr-1" />Planned RR</>}
              value={
                plannedRR != null
                  ? `1 : ${plannedRR.toFixed(2)}`
                  : <span className="text-champagne text-xs">SL & TP Required</span>
              }
              mono={plannedRR != null}
            />
            <SummaryRow
              label={<><Target className="size-3 inline mr-1" />Actual RR</>}
              value={
                actualRR != null
                  ? `1 : ${actualRR.toFixed(2)}`
                  : <span className="text-champagne text-xs">
                      {stopN == null ? "SL Required" : "Close Required"}
                    </span>
              }
              mono={actualRR != null}
            />
            <div className="h-px bg-border my-1" />
            <SummaryRow
              label="Max Loss"
              value={
                presetMaxLoss != null
                  ? fmtMoney(presetMaxLoss, { sign: true })
                  : maxLoss == null
                  ? "—"
                  : fmtMoney(maxLoss, { sign: true })
              }
              tone={(presetMaxLoss ?? maxLoss) == null ? undefined : "neg"}
              mono
            />
            <SummaryRow
              label="Max Profit"
              value={
                presetMaxProfit != null
                  ? fmtMoney(presetMaxProfit, { sign: true })
                  : maxProfit == null
                  ? "—"
                  : fmtMoney(maxProfit, { sign: true })
              }
              tone={(presetMaxProfit ?? maxProfit) == null ? undefined : "pos"}
              mono
            />
            {suggestedLot != null && (
              <SummaryRow
                label="Suggested lot"
                value={
                  <span className="flex items-center gap-2">
                    <span>{suggestedLot.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => setLot(String(suggestedLot))}
                      className="text-[10px] uppercase tracking-wider text-champagne hover:underline"
                    >
                      Apply
                    </button>
                  </span>
                }
                mono
              />
            )}
            <div className="h-px bg-border my-1" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-soft text-xs">Risk Preset</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-medium hover:text-champagne transition-colors"
                  >
                    {profileBadge && (
                      <span className="size-2 rounded-full" style={{ background: profileBadge.color }} />
                    )}
                    <span>
                      {selectedPreset
                        ? `${selectedPreset.name} (${Number(selectedPreset.risk_pct).toFixed(1)}%)`
                        : "No preset"}
                    </span>
                    <ChevronDown className="size-3 text-faint" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-faint px-2 py-1">Switch preset</div>
                  {presets.length === 0 && (
                    <Link to="/trading-lab" className="block px-2 py-2 text-xs text-champagne hover:underline">
                      <Beaker className="size-3 inline mr-1" /> Create your first preset
                    </Link>
                  )}
                  {presets.map((p) => {
                    const prof = riskProfileLabel(Number(p.risk_pct));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPresetId(p.id); setAutoTpApplied(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-accent transition-colors",
                          presetId === p.id && "bg-accent",
                        )}
                      >
                        <span className="size-2 rounded-full" style={{ background: prof.color }} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-soft font-mono">{Number(p.risk_pct).toFixed(1)}%</span>
                      </button>
                    );
                  })}
                  <div className="border-t border-border mt-1 pt-1">
                    <Link to="/trading-lab" className="block px-2 py-1.5 text-xs text-soft hover:text-champagne">
                      <Beaker className="size-3 inline mr-1" /> Manage presets
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="surface-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4 text-champagne" />
              Edge Context
            </div>
            {edge ? (
              <div className="rounded-lg bg-surface-2 border border-border p-4 flex flex-col gap-2.5">
                <div className="text-[10px] uppercase tracking-wider text-faint">
                  {pair} · {session ?? "Any session"} · last 90d
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Win rate" value={fmtPct(edge.winRate)} tone={edge.winRate >= 50 ? "pos" : "neg"} />
                  <Stat label="Avg R:R" value={edge.avgRR.toFixed(2)} />
                  <Stat label="Net" value={fmtMoney(edge.netPnl, { sign: true })} tone={edge.netPnl >= 0 ? "pos" : "neg"} />
                </div>
                <div className="text-[11px] text-foreground/80 leading-relaxed border-t border-border pt-2">
                  💡 {edge.suggestion}
                </div>
                <div className="text-[10px] text-faint">Sample: {edge.sample} trades</div>
              </div>
            ) : (
              <div className="rounded-lg bg-surface-2 border border-border p-4 text-center">
                <div className="text-xs text-soft">
                  Not enough history for {pair}{session ? ` · ${session}` : ""}.
                </div>
                <div className="text-[11px] text-faint mt-1">
                  Need 3+ closed trades in the last 90 days to compute edge.
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/trades" })}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-champagne text-primary-foreground hover:bg-champagne/90 h-11"
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEdit ? "Update Trade" : "Save trade"}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em] text-faint font-medium border-b border-border pb-2">
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
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

function SummaryRow({
  label,
  value,
  tone,
  mono,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "pos" | "neg";
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-soft text-xs">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          mono && "font-mono tabular-nums",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
          !tone && "text-foreground",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn(
        "text-xs font-mono tabular-nums",
        tone === "pos" && "text-pos",
        tone === "neg" && "text-neg",
      )}>{value}</div>
    </div>
  );
}
