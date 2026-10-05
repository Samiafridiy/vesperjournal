import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLaborDashboard, type LaborDashboard, type Indicator } from "@/lib/labor.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const condTone: Record<string, string> = {
  Strengthening: "text-[color:var(--pos)]",
  Weakening: "text-[color:var(--neg)]",
  Mixed: "text-[color:var(--warn)]",
  Stable: "text-muted-foreground",
  Unavailable: "text-muted-foreground",
};

const fmt = (v: number, unit: string) =>
  unit === "%" ? `${v}%` : `${v >= 0 && unit === "K" ? "" : ""}${Math.round(v).toLocaleString()}K`;
const fmtTime = (s: string | null) =>
  s ? new Date(s).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function Spark({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const r = max - min || 1;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${30 - ((v - min) / r) * 28 - 1}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke="var(--champagne)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function IndicatorCard({ ind }: { ind: Indicator }) {
  const last = ind.points[ind.points.length - 1];
  const prev = ind.points[ind.points.length - 2];
  const revised = ind.points.filter((p) => p.revisions.length).slice(-3);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{ind.name}</div>
          <div className="text-[11px] text-muted-foreground">Source: {ind.source}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">{last ? fmt(last.value, ind.unit) : "—"}</div>
          <div className="text-[11px] text-muted-foreground">{last ? last.period : "No data yet"}{last?.preliminary ? " · preliminary" : ""}</div>
        </div>
      </div>
      <Spark points={ind.points} />
      <div className="mt-1 text-xs text-muted-foreground">
        {prev ? <>Previous: {fmt(prev.value, ind.unit)}</> : "Not enough history yet."}
        {ind.latest && (
          <> · Last release: {ind.latest.actual} vs forecast {ind.latest.forecast} ({ind.latest.vsExpect === "n/a" ? "no comparison" : ind.latest.vsExpect === "inline" ? "in line" : `${ind.latest.vsExpect} expectations`})
            {ind.latest.revisedPrevious && <> · previous revised {ind.latest.previous} → {ind.latest.revisedPrevious}</>}
          </>
        )}
      </div>
      {revised.length > 0 && (
        <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          {revised.map((p) => {
            const r = p.revisions[p.revisions.length - 1];
            return <div key={p.period}>{p.period}: first {fmt(p.initial, ind.unit)} → now {fmt(r.to, ind.unit)}</div>;
          })}
        </div>
      )}
    </div>
  );
}

type Forecast = {
  id: string; target_period: string; expected_nfp: number | null; expected_unemployment: number | null;
  expected_ahe_mom: number | null; main_scenario: string; reasoning: string; market_reaction: string; lesson: string; locked_at: string;
};

function ForecastPanel({ data }: { data: LaborDashboard }) {
  const { user } = useAuth();
  const [list, setList] = useState<Forecast[]>([]);
  const [f, setF] = useState({ nfp: "", ur: "", ahe: "", scenario: "neutral", reasoning: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const target = data.nextNfp ? data.nextNfp.date.slice(0, 7) : null;

  const load = useCallback(async () => {
    const { data: rows } = await (supabase as any).from("labor_forecasts").select("*").order("target_period", { ascending: false });
    setList(rows ?? []);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const existing = target ? list.find((x) => x.target_period === target) : undefined;
  const n = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? null : Number(s));

  const submit = async () => {
    if (!user || !target) return;
    setSaving(true); setMsg("");
    const { error } = await (supabase as any).from("labor_forecasts").insert({
      user_id: user.id, target_period: target, expected_nfp: n(f.nfp), expected_unemployment: n(f.ur),
      expected_ahe_mom: n(f.ahe), main_scenario: f.scenario, reasoning: f.reasoning,
    });
    setSaving(false);
    if (error) setMsg("Could not save your forecast. Please try again.");
    else { setMsg("Forecast locked."); load(); }
  };

  const saveReview = async (id: string, market_reaction: string, lesson: string) => {
    await (supabase as any).from("labor_forecasts").update({ market_reaction, lesson }).eq("id", id);
    load();
  };

  const nfpActual = (period: string) => data.indicators.find((i) => i.key === "nfp")?.points.find((p) => p.period === period);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="tl-section-title">Your forecast</div>
      {!target ? (
        <p className="text-sm text-muted-foreground">The next payrolls release date isn't on the calendar yet.</p>
      ) : existing ? (
        <p className="text-sm text-muted-foreground">Your forecast for {target} is locked ({fmtTime(existing.locked_at)}). It can't be changed after submission.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">Payrolls (K)
            <input className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={f.nfp} onChange={(e) => setF({ ...f, nfp: e.target.value })} placeholder={data.nextNfp?.forecast} />
          </label>
          <label className="text-xs text-muted-foreground">Unemployment (%)
            <input className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={f.ur} onChange={(e) => setF({ ...f, ur: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground">Hourly earnings m/m (%)
            <input className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={f.ahe} onChange={(e) => setF({ ...f, ahe: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-3">Main scenario
            <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={f.scenario} onChange={(e) => setF({ ...f, scenario: e.target.value })}>
              <option value="high">High payrolls</option><option value="neutral">Near consensus</option><option value="low">Low payrolls</option>
            </select>
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-3">Why?
            <textarea rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground" value={f.reasoning} onChange={(e) => setF({ ...f, reasoning: e.target.value })} />
          </label>
          <div className="sm:col-span-3 flex items-center gap-3">
            <Button size="sm" onClick={submit} disabled={saving}>{saving ? "Saving…" : `Lock forecast for ${target}`}</Button>
            <span className="text-xs text-muted-foreground">{msg || "Once locked, numbers and reasoning can't be edited."}</span>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Forecast vs actual</div>
          {list.map((x) => {
            const a = nfpActual(x.target_period);
            return <ReviewRow key={x.id} x={x} actual={a ? Math.round(a.value) : null} onSave={saveReview} />;
          })}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ x, actual, onSave }: { x: Forecast; actual: number | null; onSave: (id: string, r: string, l: string) => void }) {
  const [r, setR] = useState(x.market_reaction);
  const [l, setL] = useState(x.lesson);
  const diff = actual != null && x.expected_nfp != null ? actual - Number(x.expected_nfp) : null;
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="font-medium">{x.target_period}</span>
        <span className="text-muted-foreground">You: {x.expected_nfp ?? "—"}K</span>
        <span className="text-muted-foreground">Actual: {actual ?? "not released"}{actual != null ? "K" : ""}</span>
        {diff != null && <span className="text-muted-foreground">Miss: {diff >= 0 ? "+" : ""}{diff}K</span>}
      </div>
      {x.reasoning && <p className="mt-1 text-xs text-muted-foreground">Reasoning: {x.reasoning}</p>}
      {actual != null && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="rounded-md border border-border bg-background px-2 py-1 text-xs" placeholder="How did the market react?" value={r} onChange={(e) => setR(e.target.value)} />
          <input className="rounded-md border border-border bg-background px-2 py-1 text-xs" placeholder="Lesson learned" value={l} onChange={(e) => setL(e.target.value)} onBlur={() => onSave(x.id, r, l)} />
        </div>
      )}
    </div>
  );
}

export function LaborSection() {
  const fetchFn = useServerFn(getLaborDashboard);
  const [data, setData] = useState<LaborDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Indicator["category"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchFn()); } catch { /* keep previous */ }
    setLoading(false);
  }, [fetchFn]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading labor data…</div>;
  if (!data) return <p className="p-6 text-sm text-muted-foreground">Labor data is unavailable right now. Try again shortly.</p>;

  const cats = ["hiring", "firing", "demand", "wages"] as const;
  const labels = { hiring: "Hiring", firing: "Firing / layoffs", demand: "Worker demand", wages: "Wages" };
  const shown = data.indicators.filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Synced {fmtTime(data.syncedAt)}{data.sourceStatus === "unavailable" ? " · government source unreachable, showing last stored data" : ""}{data.trackingSince ? ` · revisions tracked since ${fmtTime(data.trackingSince)}` : ""}</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /></Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="tl-section-title">Overall picture</div>
        <p className="mt-1 text-sm">{data.picture}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c) => (
          <div key={c} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{labels[c]}</div>
            <div className={cn("mt-1 text-sm font-semibold", condTone[data.categories[c].condition])}>{data.categories[c].condition}</div>
            <p className="mt-1 text-xs text-muted-foreground">{data.categories[c].text}</p>
          </div>
        ))}
      </div>

      {data.conflicts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="tl-section-title">Data conflicts</div>
          {data.conflicts.map((c) => (
            <div key={c.title} className="text-sm">
              <div className="font-medium">{c.title} <span className="text-xs text-muted-foreground">· {c.indicators}</span></div>
              <p className="text-xs text-muted-foreground">What they measure: {c.measures}</p>
              <p className="text-xs text-muted-foreground">Possible reasons: {c.reasons}</p>
              <p className="text-xs text-muted-foreground">Effect on certainty: {c.certainty}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="tl-section-title">Next payrolls scenarios</div>
        <p className="text-xs text-muted-foreground">
          {data.nextNfp ? <>Release {fmtTime(data.nextNfp.date)} · consensus {data.nextNfp.forecast} · previous {data.nextNfp.previous}</> : "Next release not on the calendar yet."}
          {" "}These are possibilities with evidence, not predictions.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {data.scenarios.map((s) => (
            <div key={s.key} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{s.label}</span><span className="text-[10px] text-muted-foreground">{s.strength}</span></div>
              <div className="text-xs text-muted-foreground">{s.range}</div>
              <p className="mt-1 text-xs">{s.why}</p>
              {s.supporting.length > 0 && <ul className="mt-2 list-disc pl-4 text-[11px] text-muted-foreground">{s.supporting.slice(0, 4).map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...cats] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={cn("rounded-full border border-border px-3 py-1 text-xs", filter === c ? "bg-secondary text-foreground" : "text-muted-foreground")}>
            {c === "all" ? "All indicators" : labels[c]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((i) => <IndicatorCard key={i.key} ind={i} />)}
      </div>

      <ForecastPanel data={data} />
    </div>
  );
}
