import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Zap, CheckCircle2, AlertTriangle, Cpu, Copy } from "lucide-react";
import { parseCsv, parseMtHtml, type ParsedRow } from "@/lib/mt-import";
import { fmtMoney } from "@/lib/trade-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import trades — Vesper Journal" },
      { name: "description", content: "Auto-journal MT4/MT5 trades, or import CSV/HTML statements." },
    ],
  }),
  component: () => (
    <RouteGate>
      <AppShell>
        <ImportPage />
      </AppShell>
    </RouteGate>
  ),
});

function ImportPage() {
  return (
    <div className="px-5 md:px-10 py-8 md:py-10 max-w-[1100px] mx-auto">
      <header className="border-b border-border pb-6 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-soft mb-2">Auto-journal</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Import from MT4 / MT5</h1>
        <p className="text-soft mt-2 max-w-2xl">
          Bring trades over from any broker. Upload a statement, sync automatically with MetaApi,
          or stream live trades from an Expert Advisor.
        </p>
      </header>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="bg-surface border border-border h-11 p-1 mb-6">
          <TabsTrigger value="file" className="gap-2 data-[state=active]:bg-accent">
            <Upload className="size-4" /> File upload
          </TabsTrigger>
          <TabsTrigger value="metaapi" className="gap-2 data-[state=active]:bg-accent">
            <Zap className="size-4" /> MetaApi sync
          </TabsTrigger>
          <TabsTrigger value="ea" className="gap-2 data-[state=active]:bg-accent">
            <Cpu className="size-4" /> EA webhook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file"><FileImport /></TabsContent>
        <TabsContent value="metaapi"><MetaApiSetup /></TabsContent>
        <TabsContent value="ea"><EaSetup /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============== FILE IMPORT ============== */

function FileImport() {
  const { user } = useAuth();
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);

  async function handleFile(file: File) {
    setFileName(file.name);
    setDone(0);
    const text = await file.text();
    const rows =
      file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(text)
        : parseMtHtml(text);

    if (rows.length === 0) {
      toast.error("No trades found. Make sure you exported the closed-trades report.");
      return;
    }
    setParsed(rows);
    toast.success(`Found ${rows.length} trades. Review and confirm.`);
  }

  async function importAll() {
    if (!user) return;
    setImporting(true);
    let inserted = 0;
    // Insert in batches of 50
    for (let i = 0; i < parsed.length; i += 50) {
      const batch = parsed.slice(i, i + 50).map(({ _key: _k, ...row }) => ({
        ...row,
        user_id: user.id,
      }));
      const { error, count } = await supabase
        .from("trades")
        .insert(batch, { count: "exact" });
      if (error) {
        toast.error(`Failed at row ${i}: ${error.message}`);
        break;
      }
      inserted += count ?? batch.length;
      setDone(inserted);
    }
    setImporting(false);
    toast.success(`Imported ${inserted} trades.`);
    if (inserted > 0) {
      setParsed([]);
      setFileName("");
    }
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card p-6 md:p-8"
      >
        <div className="flex items-start gap-4 mb-5">
          <div className="size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
            <FileText className="size-5 text-champagne" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Upload statement</h2>
            <p className="text-sm text-soft mt-1">
              Supports MT4 / MT5 <code className="text-champagne">.htm</code> statements and
              broker <code className="text-champagne">.csv</code> exports (cTrader, TradeLocker, MT5).
            </p>
          </div>
        </div>

        <label
          htmlFor="file-upload"
          className="block border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-champagne/40 hover:bg-surface/40 transition-colors"
        >
          <Upload className="size-8 text-soft mx-auto mb-3" />
          <div className="text-sm font-medium">
            {fileName ? fileName : "Drop file or click to browse"}
          </div>
          <div className="text-xs text-faint mt-1">.htm, .html, or .csv — up to 5 MB</div>
          <input
            id="file-upload"
            type="file"
            accept=".htm,.html,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <div className="mt-5 text-xs text-soft space-y-1.5">
          <div className="font-medium text-foreground mb-1">How to export from MT4 / MT5:</div>
          <div>1. Open your terminal → <span className="text-champagne">Account History</span> tab</div>
          <div>2. Right-click → <span className="text-champagne">Save as Detailed Report</span></div>
          <div>3. Save the <code>.htm</code> file and upload it here</div>
        </div>
      </motion.div>

      {parsed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <div className="text-xs uppercase tracking-wider text-faint">Preview</div>
              <div className="text-lg font-semibold tracking-tight">{parsed.length} trades ready</div>
            </div>
            <Button
              onClick={importAll}
              disabled={importing}
              className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11"
            >
              <CheckCircle2 className="size-4" />
              {importing ? `Importing ${done}/${parsed.length}…` : `Import ${parsed.length} trades`}
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-sidebar">
                <tr className="text-xs uppercase tracking-wider text-faint border-b border-border">
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Pair</th>
                  <th className="text-left font-medium px-5 py-3">Side</th>
                  <th className="text-right font-medium px-5 py-3">Lot</th>
                  <th className="text-right font-medium px-5 py-3">Entry</th>
                  <th className="text-right font-medium px-5 py-3">Close</th>
                  <th className="text-right font-medium px-5 py-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 200).map((t) => (
                  <tr key={t._key} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 text-soft font-mono text-xs">
                      {new Date(t.trade_date ?? "").toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2.5 font-medium">{t.pair}</td>
                    <td className="px-5 py-2.5 uppercase text-xs">
                      <span className={cn("px-2 py-0.5 rounded-md",
                        t.direction === "buy" ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg")}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-soft">{t.lot_size}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-soft">{t.entry_price}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-soft">{t.close_price ?? "—"}</td>
                    <td className={cn("px-5 py-2.5 text-right font-mono font-medium",
                      (t.pnl ?? 0) > 0 ? "text-pos" : (t.pnl ?? 0) < 0 ? "text-neg" : "text-soft")}>
                      {fmtMoney(t.pnl, { sign: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 200 && (
              <div className="text-center text-xs text-faint py-3 border-t border-border">
                Showing first 200 of {parsed.length} trades. All will be imported.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ============== METAAPI ============== */

function MetaApiSetup() {
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function runSync() {
    if (!token || !accountId) {
      toast.error("Token and account ID required");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/metaapi-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accountId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      toast.success(`Synced ${json.imported} trades from MetaApi`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card p-6 md:p-8"
      >
        <div className="flex items-start gap-4 mb-5">
          <div className="size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
            <Zap className="size-5 text-champagne" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">MetaApi cloud sync</h2>
            <p className="text-sm text-soft mt-1">
              Connect your live MT4 / MT5 account through{" "}
              <a href="https://metaapi.cloud" target="_blank" rel="noreferrer" className="text-champagne underline-offset-2 hover:underline">
                metaapi.cloud
              </a>{" "}
              to auto-sync trades. Free tier covers ~1 account.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-warn/5 border border-warn/20 p-4 mb-5 flex gap-3">
          <AlertTriangle className="size-4 text-warn shrink-0 mt-0.5" />
          <div className="text-xs text-soft leading-relaxed">
            <span className="text-foreground font-medium">Setup steps</span> — Sign up at metaapi.cloud → Add a MetaTrader account
            (paste your broker login + server) → Copy the API token + account ID below.
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ma-token" className="text-xs uppercase tracking-wider text-faint">MetaApi token</Label>
            <Input
              id="ma-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGc…"
              className="bg-surface border-border h-11 mt-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor="ma-account" className="text-xs uppercase tracking-wider text-faint">Account ID</Label>
            <Input
              id="ma-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="abc123-def456-…"
              className="bg-surface border-border h-11 mt-1.5 font-mono text-xs"
            />
          </div>
          <Button
            onClick={runSync}
            disabled={syncing}
            className="bg-champagne text-primary-foreground hover:bg-champagne/90 gap-2 h-11 w-full md:w-auto"
          >
            <Zap className="size-4" />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============== EA WEBHOOK ============== */

function EaSetup() {
  const { user } = useAuth();
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/ea-webhook?uid=${user?.id ?? "YOUR_USER_ID"}`
      : "";

  function copy() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-6 md:p-8"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="size-11 rounded-xl bg-champagne/10 ring-1 ring-champagne/30 flex items-center justify-center shrink-0">
          <Cpu className="size-5 text-champagne" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Expert Advisor webhook</h2>
          <p className="text-sm text-soft mt-1">
            For traders who want zero third-party services. Install a small EA in your MT4 / MT5
            terminal that POSTs every closed trade to your private webhook.
          </p>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-faint">Your webhook URL</Label>
        <div className="flex gap-2 mt-1.5">
          <Input readOnly value={webhookUrl} className="bg-surface border-border h-11 font-mono text-xs" />
          <Button onClick={copy} variant="outline" className="h-11 gap-2 shrink-0">
            <Copy className="size-4" /> Copy
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-faint mb-2">EA payload format</div>
        <pre className="bg-surface border border-border rounded-lg p-4 text-xs font-mono text-soft overflow-x-auto">
{`POST ${webhookUrl}
Content-Type: application/json

{
  "pair": "XAUUSD",
  "direction": "buy",
  "lot_size": 0.10,
  "entry_price": 2345.50,
  "close_price": 2351.20,
  "stop_loss": 2342.00,
  "take_profit": 2355.00,
  "trade_date": "2024-05-12T14:30:00Z"
}`}
        </pre>
      </div>

      <div className="mt-5 rounded-lg bg-surface border border-border p-4 text-xs text-soft leading-relaxed">
        <span className="text-foreground font-medium">Coming soon:</span> downloadable
        <code className="text-champagne mx-1">.ex5</code> and <code className="text-champagne">.ex4</code> Expert Advisors
        pre-configured with your webhook. For now, a simple WebRequest EA in MQL4/MQL5 works.
      </div>
    </motion.div>
  );
}