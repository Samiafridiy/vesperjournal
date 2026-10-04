import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- Types ---------- */
export type Condition = "Strengthening" | "Stable" | "Weakening" | "Mixed" | "Unavailable";
export type Strength = "STRONG EVIDENCE" | "MODERATE EVIDENCE" | "WEAK EVIDENCE" | "MIXED EVIDENCE";

export type Point = { period: string; value: number; initial: number; revisions: { at: string; from: number; to: number }[]; preliminary: boolean };
export type Indicator = {
  key: string;
  name: string;
  unit: string;
  source: string;
  category: "hiring" | "firing" | "demand" | "wages";
  points: Point[]; // oldest -> newest
  latest?: { actual: string; forecast: string; previous: string; revisedPrevious: string | null; date: string; vsExpect: "above" | "below" | "inline" | "n/a" };
};
export type Conflict = { title: string; indicators: string; measures: string; reasons: string; certainty: string };
export type Scenario = { key: "high" | "neutral" | "low"; label: string; range: string; supporting: string[]; contradicting: string[]; strength: Strength; why: string };
export type CalendarRow = { title: string; date: string; actual: string; forecast: string; previous: string; previous_revised: boolean; previous_original: string | null; status: string };
export type LaborDashboard = {
  syncedAt: string | null;
  sourceStatus: "ok" | "unavailable";
  trackingSince: string | null;
  indicators: Indicator[];
  categories: Record<"hiring" | "firing" | "demand" | "wages", { condition: Condition; text: string }>;
  picture: string;
  conflicts: Conflict[];
  nextNfp: { date: string; forecast: string; previous: string } | null;
  scenarios: Scenario[];
  consensusNfp: number | null;
  calendar: CalendarRow[];
};

/* ---------- BLS sync ---------- */
const BLS_SERIES: Record<string, string> = {
  NFP_LVL: "CES0000000001",
  PRIV_LVL: "CES0500000001",
  UNRATE: "LNS14000000",
  AHE_LVL: "CES0500000003",
  JOL: "JTS000000000000000JOL",
  HIL: "JTS000000000000000HIL",
  LDL: "JTS000000000000000LDL",
};
const SYNC_EVERY_MS = 3 * 60 * 60 * 1000;

type Obs = { series_id: string; period: string; value: number; initial_value: number; revisions: any; preliminary: boolean; updated_at: string; first_seen_at: string };

async function syncBls(admin: any): Promise<"ok" | "unavailable"> {
  const key = process.env.BLS_API_KEY;
  if (!key) return "unavailable";
  const year = new Date().getUTCFullYear();
  let json: any;
  try {
    const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesid: Object.values(BLS_SERIES), startyear: String(year - 2), endyear: String(year), registrationkey: key }),
    });
    json = await res.json();
  } catch {
    return "unavailable";
  }
  if (json?.status !== "REQUEST_SUCCEEDED") return "unavailable";

  const byId = Object.fromEntries(Object.entries(BLS_SERIES).map(([k, v]) => [v, k]));
  const fresh: Record<string, { period: string; value: number; prelim: boolean }[]> = {};
  for (const s of json.Results?.series ?? []) {
    const k = byId[s.seriesID];
    if (!k) continue;
    fresh[k] = (s.data ?? [])
      .filter((d: any) => /^M\d\d$/.test(d.period) && d.period !== "M13" && d.value !== "-")
      .map((d: any) => ({
        period: `${d.year}-${d.period.slice(1)}`,
        value: Number(d.value),
        prelim: (d.footnotes ?? []).some((f: any) => f?.code === "P"),
      }))
      .sort((a: any, b: any) => a.period.localeCompare(b.period));
  }
  // Derived monthly changes
  const derive = (src: string, fn: (arr: any[], i: number) => number | null) =>
    (fresh[src] ?? []).map((p, i, arr) => ({ ...p, value: fn(arr, i) })).filter((p) => p.value != null) as any[];
  fresh.NFP_CHG = derive("NFP_LVL", (a, i) => (i > 0 ? a[i].value - a[i - 1].value : null));
  fresh.PRIV_CHG = derive("PRIV_LVL", (a, i) => (i > 0 ? a[i].value - a[i - 1].value : null));
  fresh.AHE_MOM = derive("AHE_LVL", (a, i) => (i > 0 ? +(((a[i].value / a[i - 1].value) - 1) * 100).toFixed(2) : null));
  fresh.AHE_YOY = derive("AHE_LVL", (a, i) => (i > 11 ? +(((a[i].value / a[i - 12].value) - 1) * 100).toFixed(2) : null));

  const { data: existing } = await admin.from("labor_observations").select("series_id,period,value,initial_value,revisions");
  const ex = new Map<string, any>((existing ?? []).map((r: any) => [`${r.series_id}|${r.period}`, r]));
  const now = new Date().toISOString();
  const rows: any[] = [];
  for (const [sid, pts] of Object.entries(fresh)) {
    for (const p of pts) {
      const old = ex.get(`${sid}|${p.period}`);
      if (!old) {
        rows.push({ series_id: sid, period: p.period, value: p.value, initial_value: p.value, revisions: [], preliminary: p.prelim, updated_at: now });
      } else if (Number(old.value) !== p.value) {
        rows.push({
          series_id: sid, period: p.period, value: p.value, initial_value: old.initial_value,
          revisions: [...(old.revisions ?? []), { at: now, from: Number(old.value), to: p.value }],
          preliminary: p.prelim, updated_at: now,
        });
      }
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await admin.from("labor_observations").upsert(rows.slice(i, i + 500), { onConflict: "series_id,period" });
  }
  // touch marker so we don't refetch constantly
  await admin.from("labor_observations").upsert(
    { series_id: "_SYNC", period: "0000-00", value: 0, initial_value: 0, updated_at: now },
    { onConflict: "series_id,period" },
  );
  return "ok";
}

/* ---------- Helpers ---------- */
const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  let v = Number(m[0]);
  if (/K/i.test(s)) v *= 1;
  if (/M/i.test(s)) v *= 1000;
  return v;
};
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fmtK = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v)}K`;
const monthName = (p: string) => new Date(`${p}-15T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function trend(points: Point[], n = 3, tol = 0.05): "up" | "down" | "flat" | null {
  if (points.length < n * 2) return null;
  const recent = avg(points.slice(-n).map((p) => p.value));
  const prior = avg(points.slice(-n * 2, -n).map((p) => p.value));
  const base = Math.max(Math.abs(prior), 1e-6);
  const d = (recent - prior) / base;
  if (Math.abs(d) <= tol) return "flat";
  return d > 0 ? "up" : "down";
}

/* ---------- Main fn ---------- */
export const getLaborDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LaborDashboard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;

    const { data: marker } = await admin.from("labor_observations").select("updated_at").eq("series_id", "_SYNC").maybeSingle();
    let sourceStatus: "ok" | "unavailable" = "ok";
    if (!marker || Date.now() - new Date(marker.updated_at).getTime() > SYNC_EVERY_MS) {
      sourceStatus = await syncBls(admin);
    }

    const { data: obs } = await admin.from("labor_observations").select("*").neq("series_id", "_SYNC").order("period");
    const { data: mk2 } = await admin.from("labor_observations").select("updated_at").eq("series_id", "_SYNC").maybeSingle();
    const series = new Map<string, Point[]>();
    let trackingSince: string | null = null;
    for (const o of (obs ?? []) as Obs[]) {
      if (!trackingSince || o.first_seen_at < trackingSince) trackingSince = o.first_seen_at;
      const arr = series.get(o.series_id) ?? [];
      arr.push({ period: o.period, value: Number(o.value), initial: Number(o.initial_value), revisions: o.revisions ?? [], preliminary: o.preliminary });
      series.set(o.series_id, arr);
    }

    // Calendar rows (ForexFactory) for consensus, ADP, claims
    const titles = ["Non-Farm Employment Change", "ADP Non-Farm Employment Change", "ADP Weekly Employment Change", "Unemployment Claims", "Average Hourly Earnings m/m", "Unemployment Rate", "JOLTS Job Openings", "Challenger Job Cuts y/y"];
    const { data: cal } = await admin
      .from("calendar_events")
      .select("title,event_date,actual,forecast,previous,previous_revised,previous_original,status")
      .eq("country", "USD")
      .in("title", titles)
      .order("event_date");
    const calendar: CalendarRow[] = (cal ?? []).map((r: any) => ({ ...r, date: r.event_date }));
    const calSeries = (title: string): Point[] =>
      calendar.filter((r) => r.title === title && num(r.actual) != null).map((r) => ({
        period: r.date.slice(0, 10), value: num(r.actual)!, initial: num(r.actual)!, revisions: [], preliminary: false,
      }));
    const latestCal = (title: string) => {
      const rows = calendar.filter((r) => r.title === title);
      const released = rows.filter((r) => r.actual);
      const r = released[released.length - 1];
      if (!r) return undefined;
      const a = num(r.actual), f = num(r.forecast);
      const vs = a == null || f == null ? "n/a" : Math.abs(a - f) <= Math.max(Math.abs(f) * 0.02, 0.05) ? "inline" : a > f ? "above" : "below";
      return {
        actual: r.actual, forecast: r.forecast || "—", previous: r.previous_original ?? r.previous ?? "—",
        revisedPrevious: r.previous_revised ? r.previous : null, date: r.date, vsExpect: vs as any,
      };
    };

    const ind = (key: string, name: string, unit: string, source: string, category: Indicator["category"], points: Point[], latest?: Indicator["latest"]): Indicator =>
      ({ key, name, unit, source, category, points: points.slice(-24), latest });

    const nfp = series.get("NFP_CHG") ?? [];
    const priv = series.get("PRIV_CHG") ?? [];
    const unrate = series.get("UNRATE") ?? [];
    const aheM = series.get("AHE_MOM") ?? [];
    const aheY = series.get("AHE_YOY") ?? [];
    const jol = series.get("JOL") ?? [];
    const hil = series.get("HIL") ?? [];
    const ldl = series.get("LDL") ?? [];
    const adp = calSeries("ADP Non-Farm Employment Change");
    const claims = calSeries("Unemployment Claims");

    const indicators: Indicator[] = [
      ind("nfp", "Nonfarm Payrolls (monthly change)", "K", "BLS", "hiring", nfp, latestCal("Non-Farm Employment Change")),
      ind("priv", "Private payrolls (BLS, monthly change)", "K", "BLS", "hiring", priv),
      ind("adp", "ADP Employment Change", "K", "ADP via ForexFactory calendar", "hiring", adp, latestCal("ADP Non-Farm Employment Change")),
      ind("hil", "JOLTS Hires", "K", "BLS JOLTS", "hiring", hil),
      ind("claims", "Initial Jobless Claims", "K", "U.S. Dept. of Labor via ForexFactory calendar", "firing", claims, latestCal("Unemployment Claims")),
      ind("ldl", "JOLTS Layoffs & Discharges", "K", "BLS JOLTS", "firing", ldl),
      ind("unrate", "Unemployment Rate", "%", "BLS", "firing", unrate, latestCal("Unemployment Rate")),
      ind("jol", "JOLTS Job Openings", "K", "BLS JOLTS", "demand", jol, latestCal("JOLTS Job Openings")),
      ind("ahe_mom", "Average Hourly Earnings MoM", "%", "BLS", "wages", aheM, latestCal("Average Hourly Earnings m/m")),
      ind("ahe_yoy", "Average Hourly Earnings YoY", "%", "BLS", "wages", aheY),
    ];

    /* Category conditions — deterministic, from actual data only */
    const cats: LaborDashboard["categories"] = {
      hiring: { condition: "Unavailable", text: "Data unavailable / unable to verify." },
      firing: { condition: "Unavailable", text: "Data unavailable / unable to verify." },
      demand: { condition: "Unavailable", text: "Data unavailable / unable to verify." },
      wages: { condition: "Unavailable", text: "Data unavailable / unable to verify." },
    };
    if (nfp.length >= 6) {
      const r3 = avg(nfp.slice(-3).map((p) => p.value)), p3 = avg(nfp.slice(-6, -3).map((p) => p.value));
      const ht = trend(hil);
      const cond: Condition = r3 > p3 * 1.15 && ht !== "down" ? "Strengthening" : r3 < p3 * 0.85 && ht !== "up" ? "Weakening" : (r3 > p3 * 1.15 && ht === "down") || (r3 < p3 * 0.85 && ht === "up") ? "Mixed" : "Stable";
      cats.hiring = { condition: cond, text: `BLS payrolls averaged ${fmtK(r3)} over the last 3 months vs ${fmtK(p3)} in the 3 months before.${ht ? ` JOLTS hires trend: ${ht}.` : ""}` };
    }
    {
      const ct = trend(claims, 2, 0.04), lt = trend(ldl), ut = trend(unrate, 3, 0.02);
      const ups = [ct, lt, ut].filter((t) => t === "up").length, downs = [ct, lt, ut].filter((t) => t === "down").length;
      if (ct || lt || ut) {
        const cond: Condition = ups >= 2 ? "Weakening" : downs >= 2 ? "Strengthening" : ups && downs ? "Mixed" : "Stable";
        const last = unrate[unrate.length - 1];
        cats.firing = {
          condition: cond,
          text: `Layoffs & discharges trend: ${lt ?? "n/a"}; unemployment rate trend: ${ut ?? "n/a"}${last ? ` (latest ${last.value}%)` : ""}; weekly claims trend: ${ct ?? "not enough weeks collected yet"}. (Rising layoff measures = weakening.)`,
        };
      }
    }
    {
      const jt = trend(jol), ht = trend(hil);
      if (jt && ht) {
        const cond: Condition = jt === "up" && ht === "up" ? "Strengthening" : jt === "down" && ht === "down" ? "Weakening" : jt === ht ? "Stable" : jt === "flat" || ht === "flat" ? "Stable" : "Mixed";
        const lo = jol[jol.length - 1], lh = hil[hil.length - 1];
        cats.demand = { condition: cond, text: `Job openings ${lo ? `${(lo.value / 1000).toFixed(2)}M` : "n/a"} (trend ${jt}); hires ${lh ? `${(lh.value / 1000).toFixed(2)}M` : "n/a"} (trend ${ht}). Openings are jobs employers want to fill; hires are people actually hired.` };
      }
    }
    if (aheY.length >= 6) {
      const t = trend(aheY, 3, 0.03);
      const l = aheY[aheY.length - 1];
      cats.wages = { condition: t === "up" ? "Strengthening" : t === "down" ? "Weakening" : "Stable", text: `Average hourly earnings are ${l.value}% higher than a year ago (${monthName(l.period)}); 3-month trend in yearly wage growth: ${t === "up" ? "accelerating" : t === "down" ? "cooling" : "steady"}.` };
    }

    const conds = Object.values(cats).map((c) => c.condition).filter((c) => c !== "Unavailable");
    const weak = conds.filter((c) => c === "Weakening").length, strong = conds.filter((c) => c === "Strengthening").length;
    const picture = conds.length < 2 ? "Not enough verified data to describe the overall labor market." :
      weak >= 3 ? "Overall labor market appears to be cooling." :
      strong >= 3 ? "Overall labor market appears resilient." :
      weak >= 2 && strong === 0 ? "Overall labor market appears to be gradually cooling, though not across every measure." :
      strong >= 2 && weak === 0 ? "Overall labor market appears steady to firm." : "Evidence is mixed.";

    /* Conflicts */
    const conflicts: Conflict[] = [];
    const lastAdp = adp[adp.length - 1], lastPriv = priv[priv.length - 1];
    if (lastAdp && lastPriv && Math.abs(lastAdp.value - lastPriv.value) > 75) {
      conflicts.push({
        title: "ADP vs BLS private payrolls diverge",
        indicators: `ADP ${fmtK(lastAdp.value)} vs BLS private ${fmtK(lastPriv.value)}`,
        measures: "ADP is a private-sector payroll estimate from ADP client data. BLS private payrolls come from a government survey of ~120k businesses, with different coverage and methods.",
        reasons: "Different samples and timing, seasonal adjustment, and later BLS revisions. Neither is automatically 'wrong'.",
        certainty: "Lowers certainty on the next NFP print — do not anchor on ADP.",
      });
    }
    const jt = trend(jol), ht = trend(hil);
    if (jt === "up" && ht === "down") conflicts.push({
      title: "Openings rising while hires fall",
      indicators: "JOLTS openings ↑ vs JOLTS hires ↓",
      measures: "Openings = jobs employers want to fill. Hires = people actually hired.",
      reasons: "Employers may struggle to fill roles, or post jobs while becoming cautious about actually hiring.",
      certainty: "Demand signal is ambiguous; weigh actual hires more heavily for payroll growth.",
    });
    const ct = trend(claims, 2, 0.04);
    if (nfp.length >= 6 && cats.hiring.condition === "Weakening" && (ct === "down" || ct === "flat")) conflicts.push({
      title: "Claims low/steady while payroll growth slows",
      indicators: "Initial claims steady vs slowing BLS payrolls",
      measures: "Claims track people newly laid off. Payrolls track net job creation.",
      reasons: "A 'low-hire, low-fire' market: firms are not laying off but also not adding many workers.",
      certainty: "Moderately lowers certainty — weak hiring without layoffs can persist or turn.",
    });
    if (cats.wages.condition === "Strengthening" && cats.hiring.condition === "Weakening") conflicts.push({
      title: "Wages firm while hiring slows",
      indicators: "AHE accelerating vs payroll growth slowing",
      measures: "AHE measures pay per hour; payrolls measure job count.",
      reasons: "Composition effects (lower-paid jobs lost first raise the average), tight supply of workers, or lagged wage contracts.",
      certainty: "Lowers certainty on the inflation reading of the labor market.",
    });

    /* Next NFP + scenarios */
    const nowIso = new Date().toISOString();
    const nextRow = calendar.find((r) => r.title === "Non-Farm Employment Change" && r.date > nowIso && !r.actual);
    const nextNfp = nextRow ? { date: nextRow.date, forecast: nextRow.forecast || "—", previous: nextRow.previous || "—" } : null;
    const consensusNfp = nextRow ? num(nextRow.forecast) : null;

    const sup: Record<string, string[]> = { high: [], neutral: [], low: [] };
    const push = (k: "high" | "low" | "neutral", s: string) => sup[k].push(s);
    const cmap: Record<string, string> = { hiring: "Hiring", firing: "Firing / layoffs", demand: "Worker demand", wages: "Wages" };
    for (const [k, c] of Object.entries(cats)) {
      if (c.condition === "Unavailable") continue;
      // For firing, "Strengthening" means fewer layoffs (supports higher payrolls)
      if (c.condition === "Strengthening") push("high", `${cmap[k]}: ${c.text}`);
      else if (c.condition === "Weakening") push("low", `${cmap[k]}: ${c.text}`);
      else push("neutral", `${cmap[k]} (${c.condition.toLowerCase()}): ${c.text}`);
    }
    const lastNfp = nfp[nfp.length - 1];
    if (lastNfp && lastNfp.revisions.length) {
      const r = lastNfp.revisions[lastNfp.revisions.length - 1];
      push(r.to > r.from ? "high" : "low", `Most recent payroll month (${monthName(lastNfp.period)}) was revised ${r.to > r.from ? "up" : "down"}.`);
    }
    if (lastAdp && consensusNfp != null) push(lastAdp.value > consensusNfp ? "high" : "low", `ADP printed ${fmtK(lastAdp.value)} (context only — ADP is not a direct NFP forecast).`);
    for (const c of conflicts) push("neutral", `Data conflict: ${c.title}.`);

    const band = consensusNfp != null ? Math.max(40, Math.abs(consensusNfp) * 0.35) : null;
    const strengthFor = (own: number, other: number): { s: Strength; why: string } => {
      if (own === 0) return { s: "WEAK EVIDENCE", why: "Little current data points this way." };
      if (own > 0 && other > 0 && Math.abs(own - other) <= 1) return { s: "MIXED EVIDENCE", why: "Evidence on both sides is comparable." };
      if (own >= 3 && other === 0) return { s: "STRONG EVIDENCE", why: "Several independent categories point this way with little against it." };
      if (own >= 2 && own > other) return { s: "MODERATE EVIDENCE", why: "More categories support this than contradict it." };
      return { s: "WEAK EVIDENCE", why: "Only limited or contradicted support." };
    };
    const H = sup.high.length, L = sup.low.length;
    const sH = strengthFor(H, L), sL = strengthFor(L, H);
    const sN = H === L || conflicts.length ? { s: "MODERATE EVIDENCE" as Strength, why: "Signals offset each other or conflict, which favors a result near expectations." } : { s: "WEAK EVIDENCE" as Strength, why: "Evidence leans to one side." };
    const rng = (k: string) => consensusNfp == null || band == null ? "Consensus not yet published — no range shown." :
      k === "high" ? `Above ~${fmtK(consensusNfp + band)}` : k === "low" ? `Below ~${fmtK(consensusNfp - band)}` : `${fmtK(consensusNfp - band)} to ${fmtK(consensusNfp + band)} (around consensus ${fmtK(consensusNfp)})`;
    const scenarios: Scenario[] = [
      { key: "high", label: "HIGH NFP", range: rng("high"), supporting: sup.high, contradicting: sup.low, strength: sH.s, why: sH.why },
      { key: "neutral", label: "NEUTRAL NFP", range: rng("neutral"), supporting: sup.neutral, contradicting: [...sup.high, ...sup.low].slice(0, 3), strength: sN.s, why: sN.why },
      { key: "low", label: "LOW NFP", range: rng("low"), supporting: sup.low, contradicting: sup.high, strength: sL.s, why: sL.why },
    ];
    if (H === 0 && L === 0) scenarios.forEach((s) => (s.why = "Evidence is mixed or unavailable."));

    return {
      syncedAt: mk2?.updated_at ?? null,
      sourceStatus,
      trackingSince,
      indicators,
      categories: cats,
      picture,
      conflicts,
      nextNfp,
      scenarios,
      consensusNfp,
      calendar,
    };
  });
