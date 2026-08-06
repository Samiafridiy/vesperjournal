import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTradingAccounts, useRiskPresets, riskProfileLabel, projectDrawdown, type RiskPreset, type TradingAccount } from "@/hooks/use-risk";
import { useTrades } from "@/hooks/use-trades";
import { computeRiskUsedPct } from "@/lib/edge-context";
import { fmtMoney, fmtPct } from "@/lib/trade-utils";
import { toast } from "sonner";
import { Beaker, Plus, Trash2, Star, AlertTriangle, Wallet, ShieldCheck, Trophy, HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPE_LABEL,
  accountTypeBadge,
  type AccountType,
} from "@/lib/funded-account";

export const Route = createFileRoute("/trading-lab")({
  head: () => ({
    meta: [
      { title: "Trading Lab — Vesper Journal" },
      { name: "description", content: "Risk Engine: presets, drawdown projections, daily/weekly limits." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <TradingLab />
      </AppShell>
    </RouteGate>
  ),
});

function TradingLab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-5 md:px-10 py-8 md:py-10 max-w-[1400px] mx-auto"
    >
      <header className="border-b border-border pb-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Beaker className="size-4 text-champagne" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-soft font-medium">Trading Lab</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Risk Engine</h1>
        <p className="text-soft mt-2">Build risk presets, simulate drawdowns, and set daily limits.</p>
      </header>

      <Tabs defaultValue="risk" className="w-full">
        <TabsList className="bg-surface-2/50 mb-6">
          <TabsTrigger value="risk">Risk Engine</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="risk">
          <RiskEngineTab />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

/* ============== Accounts Tab ============== */

function AccountsTab() {
  const { accounts, refetch } = useTradingAccounts();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  async function makeDefault(id: string) {
    if (!user) return;
    await supabase.from("trading_accounts").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("trading_accounts").update({ is_default: true }).eq("id", id);
    toast.success("Default account updated");
    refetch();
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this account? Trades remain but lose their account link.")) return;
    const { error } = await supabase.from("trading_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Account deleted"); refetch(); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-soft">Manage broker accounts and balances. Presets calculate risk in dollars from these.</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2">
              <Plus className="size-4" /> New account
            </Button>
          </DialogTrigger>
          <AccountDialog onSaved={() => { setOpen(false); refetch(); }} />
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <EmptyHint icon={<Wallet className="size-5 text-champagne" />} title="No accounts yet" body="Add your first trading account to enable dollar-based risk calculations." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="surface-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{a.name}</span>
                    {a.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-champagne/10 border border-champagne/40 text-champagne text-[10px] uppercase tracking-wider">
                        <Star className="size-3" /> Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-soft mt-0.5">{a.broker || "—"}</div>
                </div>
              </div>
              <div className="text-2xl font-mono">{fmtMoney(Number(a.balance))}</div>
              <div className="text-xs text-faint">{a.currency}</div>
              <div className="flex gap-2 mt-2">
                {!a.is_default && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => makeDefault(a.id)}>
                    Set default
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-neg" onClick={() => deleteAccount(a.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountDialog({ onSaved, edit }: { onSaved: () => void; edit?: TradingAccount }) {
  const { user } = useAuth();
  const [name, setName] = useState(edit?.name ?? "");
  const [broker, setBroker] = useState(edit?.broker ?? "");
  const [balance, setBalance] = useState(edit ? String(edit.balance) : "10000");
  const [currency, setCurrency] = useState(edit?.currency ?? "USD");
  const [isDefault, setIsDefault] = useState(edit?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    if (isDefault) {
      await supabase.from("trading_accounts").update({ is_default: false }).eq("user_id", user.id);
    }
    const payload = { name, broker: broker || null, balance: Number(balance), currency, is_default: isDefault };
    const { error } = edit
      ? await supabase.from("trading_accounts").update(payload).eq("id", edit.id)
      : await supabase.from("trading_accounts").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Account updated" : "Account created");
    onSaved();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{edit ? "Edit account" : "New trading account"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-2">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FTMO 100k" /></Field>
        <Field label="Broker"><Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. FTMO, IC Markets" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Balance"><Input type="number" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} className="font-mono" /></Field>
          <Field label="Currency">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "JPY", "AUD", "CAD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Set as default account</span>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </label>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="bg-champagne text-primary-foreground hover:bg-champagne/90">
          {edit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ============== Risk Engine Tab ============== */

function RiskEngineTab() {
  const { presets, refetch } = useRiskPresets();
  const { accounts, defaultAccount, refetch: refetchAccounts } = useTradingAccounts();
  const { trades } = useTrades();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RiskPreset | null>(null);

  async function makeDefault(id: string) {
    if (!user) return;
    await supabase.from("risk_presets").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("risk_presets").update({ is_default: true }).eq("id", id);
    toast.success("Default preset updated");
    refetch();
  }

  async function deletePreset(id: string) {
    if (!confirm("Delete this preset?")) return;
    const { error } = await supabase.from("risk_presets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Preset deleted"); refetch(); }
  }

  // Limits status — based on default preset & default account
  const defaultPreset = presets.find((p) => p.is_default) ?? presets[0];
  const balance = Number(defaultAccount?.balance ?? 0);
  const dailyUsed = balance > 0 ? computeRiskUsedPct(trades, balance, 1) : 0;
  const weeklyUsed = balance > 0 ? computeRiskUsedPct(trades, balance, 7) : 0;
  const dailyLimit = Number(defaultPreset?.max_daily_risk_pct ?? 0);
  const weeklyLimit = Number(defaultPreset?.max_weekly_risk_pct ?? 0);
  const dailyHit = dailyLimit > 0 && dailyUsed >= dailyLimit;
  const weeklyHit = weeklyLimit > 0 && weeklyUsed >= weeklyLimit;

  return (
    <div className="flex flex-col gap-6">
      {/* Limits status */}
      {(dailyHit || weeklyHit) && (
        <div className="rounded-lg border border-neg/40 bg-neg/10 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-neg mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-neg">Risk limit hit</div>
            <div className="text-xs text-soft mt-1">
              {dailyHit && <div>Daily risk used: {fmtPct(dailyUsed)} / {fmtPct(dailyLimit)} — consider stopping today.</div>}
              {weeklyHit && <div>Weekly risk used: {fmtPct(weeklyUsed)} / {fmtPct(weeklyLimit)} — review weekly plan.</div>}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-soft">
          {accounts.length === 0
            ? "No account yet — you can add one right inside the preset form."
            : `Calculations use ${defaultAccount?.name} (${fmtMoney(balance)})`}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2">
              <Plus className="size-4" /> New preset
            </Button>
          </DialogTrigger>
          <PresetDialog
            key={editing?.id ?? "new"}
            edit={editing}
            accounts={accounts}
            defaultAccountId={defaultAccount?.id ?? null}
            onAccountsChanged={refetchAccounts}
            onSaved={() => { setOpen(false); setEditing(null); refetch(); }}
          />
        </Dialog>
      </div>

      {presets.length === 0 ? (
        <EmptyHint icon={<ShieldCheck className="size-5 text-champagne" />} title="No risk presets yet" body="Create your first preset (Conservative 1%, Aggressive 3%, etc.) to auto-apply on new trades." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((p) => {
            const profile = riskProfileLabel(Number(p.risk_pct));
            const acct = accounts.find((a) => a.id === p.account_id) ?? defaultAccount;
            const bal = Number(acct?.balance ?? 0);
            const riskAmt = bal * (Number(p.risk_pct) / 100);
            const dd5 = projectDrawdown(bal, Number(p.risk_pct), 5);
            const dd10 = projectDrawdown(bal, Number(p.risk_pct), 10);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="surface-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: profile.color }} />
                      <span className="text-base font-semibold truncate">{p.name}</span>
                      {p.is_default && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-champagne/10 border border-champagne/40 text-champagne text-[10px] uppercase tracking-wider shrink-0">
                          <Star className="size-2.5" />
                        </span>
                      )}
                      {p.funded_enabled && (() => {
                        const b = accountTypeBadge(p.account_type as AccountType);
                        return (
                          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wider shrink-0", b.className)}>
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-soft mt-0.5">{profile.label} · {p.strategy_tag || "Any strategy"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <KV k="Risk" v={`${Number(p.risk_pct).toFixed(2)}%`} />
                  <KV k="R:R" v={p.rr_ratio ? `1:${Number(p.rr_ratio).toFixed(2)}` : "—"} />
                  <KV k="Risk $" v={fmtMoney(riskAmt)} />
                  <KV k="Account" v={acct?.name ?? "—"} small />
                </div>

                <div className="rounded-md border border-border bg-surface-2/40 p-3 text-xs">
                  <div className="text-faint uppercase tracking-wider mb-2">Drawdown projection</div>
                  <div className="flex justify-between"><span className="text-soft">After 5 losses</span><span className="font-mono text-neg">−{fmtPct(dd5.lostPct)} · {fmtMoney(-dd5.lost, { sign: true })}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-soft">After 10 losses</span><span className="font-mono text-neg">−{fmtPct(dd10.lostPct)} · {fmtMoney(-dd10.lost, { sign: true })}</span></div>
                </div>

                {(p.max_daily_risk_pct || p.max_weekly_risk_pct) && (
                  <div className="text-[11px] text-soft">
                    Limits: {p.max_daily_risk_pct ? `${Number(p.max_daily_risk_pct)}%/day` : "—"} · {p.max_weekly_risk_pct ? `${Number(p.max_weekly_risk_pct)}%/wk` : "—"}
                  </div>
                )}

                <div className="flex gap-2 mt-1">
                  {!p.is_default && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => makeDefault(p.id)}>
                      Set default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-neg" onClick={() => deletePreset(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PresetDialog({
  edit, accounts, defaultAccountId, onSaved, onAccountsChanged,
}: {
  edit: RiskPreset | null;
  accounts: TradingAccount[];
  defaultAccountId: string | null;
  onSaved: () => void;
  onAccountsChanged?: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(edit?.name ?? "");
  const [riskPct, setRiskPct] = useState(edit ? String(edit.risk_pct) : "1");
  const [rr, setRr] = useState(edit?.rr_ratio ? String(edit.rr_ratio) : "");
  const [daily, setDaily] = useState(edit?.max_daily_risk_pct ? String(edit.max_daily_risk_pct) : "");
  const [weekly, setWeekly] = useState(edit?.max_weekly_risk_pct ? String(edit.max_weekly_risk_pct) : "");
  const [strategy, setStrategy] = useState(edit?.strategy_tag ?? "");
  const [accountId, setAccountId] = useState<string>(edit?.account_id ?? defaultAccountId ?? "");
  const [isDefault, setIsDefault] = useState(edit?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  // Funded account fields
  const [fundedEnabled, setFundedEnabled] = useState<boolean>(edit?.funded_enabled ?? false);
  const [accountType, setAccountType] = useState<AccountType>((edit?.account_type as AccountType) ?? "personal");
  const [profitTarget, setProfitTarget] = useState(edit?.profit_target != null ? String(edit.profit_target) : "");
  const [maxDD, setMaxDD] = useState(edit?.max_drawdown_amount != null ? String(edit.max_drawdown_amount) : "");
  const [dailyLossLimit, setDailyLossLimit] = useState(edit?.daily_loss_limit != null ? String(edit.daily_loss_limit) : "");
  const [minDays, setMinDays] = useState(edit?.min_trading_days != null ? String(edit.min_trading_days) : "");
  const [deadline, setDeadline] = useState(edit?.challenge_deadline ?? "");
  const [startingBal, setStartingBal] = useState(edit?.starting_balance != null ? String(edit.starting_balance) : "");

  // Section expansion
  const [limitsOpen, setLimitsOpen] = useState<boolean>(!!(edit?.max_daily_risk_pct || edit?.max_weekly_risk_pct));
  const [moreFundedOpen, setMoreFundedOpen] = useState<boolean>(!!(edit?.min_trading_days || edit?.challenge_deadline));

  // Inline quick-add account
  const [quickAdd, setQuickAdd] = useState(accounts.length === 0);
  const [newAcctName, setNewAcctName] = useState("");
  const [newAcctBalance, setNewAcctBalance] = useState("10000");
  const [creatingAcct, setCreatingAcct] = useState(false);
  const [localAccounts, setLocalAccounts] = useState<TradingAccount[]>(accounts);

  const allAccounts = useMemo(() => {
    const map = new Map<string, TradingAccount>();
    for (const a of [...accounts, ...localAccounts]) map.set(a.id, a);
    return Array.from(map.values());
  }, [accounts, localAccounts]);

  async function createAccountInline() {
    if (!user) return;
    if (!newAcctName.trim()) return toast.error("Account name required");
    setCreatingAcct(true);
    const { data, error } = await supabase
      .from("trading_accounts")
      .insert({
        user_id: user.id,
        name: newAcctName.trim(),
        balance: Number(newAcctBalance) || 0,
        is_default: allAccounts.length === 0,
      })
      .select()
      .single();
    setCreatingAcct(false);
    if (error || !data) return toast.error(error?.message ?? "Could not create account");
    const acct = data as TradingAccount;
    setLocalAccounts((prev) => [...prev, acct]);
    setAccountId(acct.id);
    setQuickAdd(false);
    setNewAcctName("");
    toast.success("Account added");
    onAccountsChanged?.();
  }

  const account = allAccounts.find((a) => a.id === accountId) ?? null;
  const balance = Number(account?.balance ?? 0);
  const riskN = Number(riskPct) || 0;
  const profile = useMemo(() => riskProfileLabel(riskN), [riskN]);
  const riskAmt = balance * (riskN / 100);
  const dd5 = projectDrawdown(balance, riskN, 5);
  const dd10 = projectDrawdown(balance, riskN, 10);

  async function save() {
    if (!user) return;
    if (!name.trim()) return toast.error("Name required");
    if (!accountId) return toast.error("Pick an account");
    setSaving(true);
    if (isDefault) {
      await supabase.from("risk_presets").update({ is_default: false }).eq("user_id", user.id);
    }
    const payload = {
      name,
      risk_pct: Number(riskPct),
      rr_ratio: rr ? Number(rr) : null,
      max_daily_risk_pct: daily ? Number(daily) : null,
      max_weekly_risk_pct: weekly ? Number(weekly) : null,
      strategy_tag: strategy || null,
      account_id: accountId,
      is_default: isDefault,
      funded_enabled: fundedEnabled,
      account_type: fundedEnabled ? accountType : "personal",
      profit_target: fundedEnabled && profitTarget ? Number(profitTarget) : null,
      max_drawdown_amount: fundedEnabled && maxDD ? Number(maxDD) : null,
      daily_loss_limit: fundedEnabled && dailyLossLimit ? Number(dailyLossLimit) : null,
      min_trading_days: fundedEnabled && minDays ? Number(minDays) : null,
      challenge_deadline: fundedEnabled && deadline ? deadline : null,
      starting_balance: fundedEnabled ? Number(startingBal || balance || 0) : null,
    };
    const { error } = edit
      ? await supabase.from("risk_presets").update(payload).eq("id", edit.id)
      : await supabase.from("risk_presets").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Preset updated" : "Preset created");
    onSaved();
  }

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{edit ? "Edit risk preset" : "New risk preset"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Basics */}
          <div className="flex flex-col gap-4">
            <div className="text-[11px] uppercase tracking-wider text-faint">Basics</div>
            <Field label="Preset name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Conservative" /></Field>
            <Field label="Account">
              {quickAdd ? (
                <div className="rounded-md border border-border bg-surface-2/40 p-3 flex flex-col gap-3">
                  <div className="text-xs text-soft">Add an account — used to turn your risk % into dollars.</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={newAcctName} onChange={(e) => setNewAcctName(e.target.value)} placeholder="Account name" />
                    <Input type="number" step="any" value={newAcctBalance} onChange={(e) => setNewAcctBalance(e.target.value)} placeholder="Starting balance" className="font-mono" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={createAccountInline} disabled={creatingAcct} className="bg-champagne text-primary-foreground hover:bg-champagne/90">
                      Add account
                    </Button>
                    {allAccounts.length > 0 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setQuickAdd(false)}>Cancel</Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Pick account" /></SelectTrigger>
                    <SelectContent>
                      {allAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {fmtMoney(Number(a.balance))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setQuickAdd(true)} aria-label="Add account">
                    <Plus className="size-4" />
                  </Button>
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Risk per trade %"><Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className="font-mono" /></Field>
              <Field label="R:R ratio (optional)" hint="How much you aim to win compared to what you risk — 2 means you target $2 for every $1 risked.">
                <Input type="number" step="0.1" value={rr} onChange={(e) => setRr(e.target.value)} placeholder="e.g. 2" className="font-mono" />
              </Field>
            </div>
            <Field label="Strategy tag (optional)"><Input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="e.g. Breakout, ICT" /></Field>
          </div>

          {/* Risk limits (collapsed) */}
          <div className="border-t border-border pt-4">
            <SectionToggle open={limitsOpen} onToggle={() => setLimitsOpen((v) => !v)} label="Risk limits" sub="Optional caps on how much you can risk per day or week" />
            {limitsOpen && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Max daily risk %"><Input type="number" step="0.1" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="e.g. 3" className="font-mono" /></Field>
                <Field label="Max weekly risk %"><Input type="number" step="0.1" value={weekly} onChange={(e) => setWeekly(e.target.value)} placeholder="e.g. 6" className="font-mono" /></Field>
              </div>
            )}
          </div>
          {/* Funded Account Settings */}
          <div className="border-t border-border pt-4">
            <label className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Trophy className="size-4 text-champagne" />
                Funded Account Rules
              </span>
              <Switch checked={fundedEnabled} onCheckedChange={setFundedEnabled} />
            </label>
            {fundedEnabled && (
              <div className="flex flex-col gap-3">
                <Field label="Account type">
                  <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">{ACCOUNT_TYPE_LABEL.personal}</SelectItem>
                      <SelectItem value="challenge_p1">{ACCOUNT_TYPE_LABEL.challenge_p1}</SelectItem>
                      <SelectItem value="challenge_p2">{ACCOUNT_TYPE_LABEL.challenge_p2}</SelectItem>
                      <SelectItem value="funded_live">{ACCOUNT_TYPE_LABEL.funded_live}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={`Starting balance (defaults to ${fmtMoney(balance)})`}>
                  <Input type="number" step="any" value={startingBal} onChange={(e) => setStartingBal(e.target.value)} placeholder={String(balance)} className="font-mono" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Profit target ($)"><Input type="number" step="any" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)} placeholder="e.g. 500" className="font-mono" /></Field>
                  <Field label="Max DD ($)" hint="Max drawdown: the largest total loss your funded account allows before it's breached.">
                    <Input type="number" step="any" value={maxDD} onChange={(e) => setMaxDD(e.target.value)} placeholder="e.g. 400" className="font-mono" />
                  </Field>
                </div>
                <Field label="Daily loss limit ($)"><Input type="number" step="any" value={dailyLossLimit} onChange={(e) => setDailyLossLimit(e.target.value)} placeholder="e.g. 200" className="font-mono" /></Field>
                <div className="border-t border-border pt-3">
                  <SectionToggle open={moreFundedOpen} onToggle={() => setMoreFundedOpen((v) => !v)} label="More details" sub="Min trading days and challenge deadline" />
                  {moreFundedOpen && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Field label="Min trading days"><Input type="number" step="1" value={minDays} onChange={(e) => setMinDays(e.target.value)} placeholder="e.g. 5" className="font-mono" /></Field>
                      <Field label="Challenge deadline"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="font-mono" /></Field>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm">Set as default preset</span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-border bg-surface-2/30 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-faint">
              Live preview · {fundedEnabled ? "Funded Account" : "Live Account"}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
                profile.tone === "pos" && "bg-pos/10 border-pos/40 text-pos",
                profile.tone === "warn" && "bg-champagne/10 border-champagne/40 text-champagne",
                profile.tone === "neg" && "bg-neg/10 border-neg/40 text-neg",
              )}
            >
              <span className="size-2 rounded-full" style={{ background: profile.color }} />
              {profile.label}
            </span>
          </div>
          {(() => {
            const ddNum = Number(maxDD) || 0;
            const useFunded = fundedEnabled && ddNum > 0;
            const baseAmt = useFunded ? ddNum : balance;
            const perTrade = baseAmt * (riskN / 100);
            const baseLabel = useFunded ? "drawdown limit" : "account balance";
            return (
              <div>
                <div className="text-xs text-soft">Risk per trade</div>
                <div className="text-3xl font-mono">{fmtMoney(perTrade)}</div>
                <div className="text-xs text-faint">
                  {riskN.toFixed(2)}% of {fmtMoney(baseAmt)} {baseLabel}
                </div>
                {useFunded && (
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-soft">Losses until account breach</span>
                      <span className="font-mono text-neg">
                        {perTrade > 0 ? Math.floor(ddNum / perTrade) : "—"} trades
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-soft">Remaining drawdown after 5 losses</span>
                      <span className="font-mono">
                        {fmtMoney(Math.max(0, ddNum - perTrade * 5))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {rr && !fundedEnabled && (
            <div>
              <div className="text-xs text-soft">Reward at {rr}R</div>
              <div className="text-xl font-mono text-pos">{fmtMoney(riskAmt * Number(rr), { sign: true })}</div>
            </div>
          )}
          {!fundedEnabled && <div className="border-t border-border pt-3">
            <div className="text-[11px] uppercase tracking-wider text-faint mb-2 flex items-center gap-1.5">
              Drawdown projection
              <InfoTip text="Drawdown projection: how much of your account you'd lose if several trades in a row lost." />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-soft">After 5 losses</span><span className="font-mono text-neg">−{fmtPct(dd5.lostPct)} · {fmtMoney(-dd5.lost, { sign: true })}</span></div>
              <div className="flex justify-between"><span className="text-soft">After 10 losses</span><span className="font-mono text-neg">−{fmtPct(dd10.lostPct)} · {fmtMoney(-dd10.lost, { sign: true })}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-soft">Balance after 10 losses</span><span className="font-mono">{fmtMoney(dd10.remaining)}</span></div>
            </div>
          </div>}
          {fundedEnabled && (() => {
            const startBal = Number(startingBal) || balance;
            const dd = Number(maxDD) || 0;
            const dl = Number(dailyLossLimit) || 0;
            const pt = Number(profitTarget) || 0;
            // Risk per trade calculated from MAX DRAWDOWN, not balance
            const fundedRisk = dd > 0 ? dd * (riskN / 100) : 0;
            const lossesToDD = fundedRisk > 0 ? Math.floor(dd / fundedRisk) : 0;
            const lossesToDaily = fundedRisk > 0 && dl > 0 ? Math.floor(dl / fundedRisk) : 0;
            const badge = accountTypeBadge(accountType);
            const dlNum = (() => {
              if (!deadline) return null;
              const d = new Date(deadline);
              const now = new Date();
              now.setHours(0,0,0,0);
              return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
            })();
            return (
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-wider text-faint">Funded preview</div>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider", badge.className)}>
                    {badge.label}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-soft">Risk per trade (of max DD)</span><span className="font-mono">{fmtMoney(fundedRisk)}</span></div>
                  <div className="flex justify-between"><span className="text-soft">Losses until max DD breached</span><span className="font-mono text-neg">{lossesToDD || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-soft">Losses until daily limit breached</span><span className="font-mono text-champagne">{lossesToDaily || "—"}</span></div>
                  {pt > 0 && <div className="flex justify-between"><span className="text-soft">Profit target</span><span className="font-mono text-pos">{fmtMoney(pt)} ({((pt / startBal) * 100).toFixed(1)}%)</span></div>}
                  {dlNum != null && <div className="flex justify-between"><span className="text-soft">Days remaining</span><span className={cn("font-mono", dlNum <= 3 ? "text-neg" : "")}>{dlNum < 0 ? "Expired" : dlNum}</span></div>}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="bg-champagne text-primary-foreground hover:bg-champagne/90">
          {edit ? "Save preset" : "Create preset"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-[0.1em] text-faint flex items-center gap-1.5">
        {label}
        {hint && <InfoTip text={hint} />}
      </Label>
      {children}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="More info" className="text-faint hover:text-champagne transition-colors">
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs normal-case tracking-normal">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionToggle({ open, onToggle, label, sub }: { open: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between text-left group"
    >
      <span>
        <span className="text-[11px] uppercase tracking-wider text-faint group-hover:text-soft transition-colors">{label}</span>
        {sub && <span className="block text-[11px] text-faint/70 mt-0.5 normal-case">{sub}</span>}
      </span>
      <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} />
    </button>
  );
}
function KV({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-faint">{k}</div>
      <div className={cn("font-mono", small ? "text-xs" : "text-sm")}>{v}</div>
    </div>
  );
}
function EmptyHint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card-elevated top-accent p-10 text-center max-w-xl mx-auto">
      <div className="size-12 rounded-xl bg-champagne/10 ring-1 ring-champagne/20 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-soft mt-2 text-sm">{body}</p>
    </div>
  );
}