import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* =====================================================================
   U.S. Labor Market Intelligence
   Facts first. Evidence before conclusions. No fake certainty. No hindsight.
   ===================================================================== */

export type Condition = "Strengthening" | "Stable" | "Weakening" | "Mixed" | "Unavailable";
export type Strength = "STRONG EVIDENCE" | "MODERATE EVIDENCE" | "WEAK EVIDENCE" | "MIXED EVIDENCE";
export type Dir = "up" | "down" | "flat" | null;
export type Cat = "hiring" | "firing" | "demand" | "wages" | "supply" | "hours" | "jolts" | "sectors" | "claims";
export type Timing = "Leading / early signal" | "Coincident" | "Lagging";
export type Kind = "Actual observation" | "Derived calculation" | "Moving average";
export type Unit = "K" | "Klevel" | "%" | "h" | "$";

export type Point = { period: string; value: number; initial: number; revisions: { at: string; from: number; to: number }[]; preliminary: boolean; seen: string };
export type Stats = { chg1: number | null; avg3: number | null; avg6: number | null; avg12: number | null; t3: Dir; t6: Dir; t12: Dir };
export type Indicator = {
  key: string;
  name: string;
  unit: Unit;
  source: string;
  cats: Cat[];
  timing: Timing;
  kind: Kind;
  lag: string;
  note?: string;
  available: boolean;
  points: Point[]; // oldest -> newest
  stats: Stats;
  nextRelease: string | null;
  latest?: { actual: string; forecast: string; previous: string; revisedPrevious: string | null; date: string; vsExpect: "above" | "below" | "inline" | "n/a" };
};
export type Conflict = { title: string; indicators: string; measures: string; reasons: string; certainty: string };
export type Signal = "Supports stronger NFP" | "Supports weaker NFP" | "Neutral" | "Mixed" | "Insufficient evidence";
export type Evidence = { group: string; indicator: string; signal: Signal; detail: string; vintage: string };
export type Scenario = {
  key: "high" | "neutral" | "low"; label: string; range: string; definition: string;
  supporting: string[]; contradicting: string[]; strength: Strength; why: string;
  keyIndicators: string[]; confirm: string; invalidate: string;
};
export type RevisionRow = { period: string; initial: number | null; rev1: number | null; rev2: number | null; latest: number | null; total: number | null; source: string };
export type CalendarRow = { title: string; date: string; actual: string; forecast: string; previous: string; previous_revised: boolean; previous_original: string | null; status: string };
export type Consensus = { name: string; consensus: string; previous: string; actual: string | null; available: boolean };
export type Review = {
  refMonth: string; releaseDate: string; consensus: number | null; actual: number | null;
  outcome: "above" | "below" | "inline" | "n/a";
  board: Evidence[]; lean: "stronger" | "weaker" | "balanced";
  useful: string[]; misled: string[]; afterOnly: string[];
};
export type LaborDashboard = {
  syncedAt: string | null;
  sourceStatus: "ok" | "unavailable";
  freshness: "Current" | "Partially updated" | "Stale";
  trackingSince: string | null;
  indicators: Indicator[];
  categories: Record<"hiring" | "firing" | "demand" | "wages", { condition: Condition; text: string; forEv: string[]; againstEv: string[] }>;
  overall: { label: "Strengthening" | "Stable" | "Cooling" | "Weakening" | "Mixed" | "Insufficient data"; strength: "Weak" | "Moderate" | "Strong"; supporting: number; contradicting: number; text: string };
  picture: string;
  conflicts: Conflict[];
  nextNfp: { date: string; forecast: string; previous: string; refMonth: string } | null;
  board: Evidence[];
  scenarios: Scenario[];
  consensusNfp: number | null;
  consensus: Consensus[];
  revisions: RevisionRow[];
  revisionDirection: "Upward" | "Downward" | "Mixed" | "Not enough history";
  sectors: { name: string; current: number | null; previous: number | null; revision: number | null; avg3: number | null }[];
  review: Review | null;
  transmission: string[] | null;
  upcoming: CalendarRow[];
  calendar: CalendarRow[];
};

/* ---------- BLS series catalogue (≤50 per request) ---------- */
const BLS_SERIES: Record<string, string> = {
  NFP_LVL: "CES0000000001", PRIV_LVL: "CES0500000001", GOV_LVL: "CES9000000001",
  UNRATE: "LNS14000000", U6: "LNS13327709", LFPR: "LNS11300000", EPOP: "LNS12300000",
  LF: "LNS11000000", EMP: "LNS12000000", UNEMP: "LNS13000000", FT: "LNS12500000", PT: "LNS12600000", PTER: "LNS12032194",
  AHE_LVL: "CES0500000003", AWE: "CES0500000011",
  AWH: "CES0500000002", MFG_HRS: "CES3000000002", MFG_OT: "CES3000000004",
  JOL: "JTS000000000000000JOL", JOR: "JTS000000000000000JOR",
  HIL: "JTS000000000000000HIL", HIR: "JTS000000000000000HIR",
  TSL: "JTS000000000000000TSL", QUL: "JTS000000000000000QUL", QUR: "JTS000000000000000QUR",
  LDL: "JTS000000000000000LDL", LDR: "JTS000000000000000LDR",
  OSL: "JTS000000000000000OSL", OSR: "JTS000000000000000OSR",
  S_MIN_LVL: "CES1000000001", S_CON_LVL: "CES2000000001", S_MFG_LVL: "CES3000000001",
  S_RET_LVL: "CES4200000001", S_TRN_LVL: "CES4300000001", S_INF_LVL: "CES5000000001",
  S_FIN_LVL: "CES5500000001", S_PBS_LVL: "CES6000000001", S_EDU_LVL: "CES6561000001",
  S_HC_LVL: "CES6562000001", S_LEI_LVL: "CES7000000001", S_OTH_LVL: "CES8000000001",
};
const SECTORS: [string, string][] = [
  ["S_HC", "Healthcare"], ["GOV", "Government"], ["S_MFG", "Manufacturing"], ["S_CON", "Construction"],
  ["S_RET", "Retail trade"], ["S_LEI", "Leisure & hospitality"], ["S_PBS", "Professional & business services"],
  ["S_TRN", "Transportation & warehousing"], ["S_FIN", "Financial activities"], ["S_EDU", "Private education"],
  ["S_INF", "Information"], ["S_OTH", "Other services"], ["S_MIN", "Mining & logging"],
];
const SYNC_KEY = "_SYNC2";
const SYNC_EVERY_MS = 3 * 60 * 60 * 1000;

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
      .filter((d: any) => /^M\d\d$/.test(d.period) && d.period !== "M13" && d.value !== "-" && !isNaN(Number(d.value)))
      .map((d: any) => ({ period: `${d.year}-${d.period.slice(1)}`, value: Number(d.value), prelim: (d.footnotes ?? []).some((f: any) => f?.code === "P") }))
      .sort((a: any, b: any) => a.period.localeCompare(b.period));
  }
  const derive = (src: string, fn: (arr: any[], i: number) => number | null) =>
    (fresh[src] ?? []).map((p, i, arr) => ({ ...p, value: fn(arr, i) })).filter((p) => p.value != null) as any[];
  const chg = (a: any[], i: number) => (i > 0 ? a[i].value - a[i - 1].value : null);
  fresh.NFP_CHG = derive("NFP_LVL", chg);
  fresh.PRIV_CHG = derive("PRIV_LVL", chg);
  fresh.GOV_CHG = derive("GOV_LVL", chg);
  for (const [k] of SECTORS) if (k !== "GOV") fresh[`${k}_CHG`] = derive(`${k}_LVL`, chg);
  fresh.AHE_MOM = derive("AHE_LVL", (a, i) => (i > 0 ? +((a[i].value / a[i - 1].value - 1) * 100).toFixed(2) : null));
  fresh.AHE_YOY = derive("AHE_LVL", (a, i) => (i > 11 ? +((a[i].value / a[i - 12].value - 1) * 100).toFixed(2) : null));
  fresh.AWE_YOY = derive("AWE", (a, i) => (i > 11 ? +((a[i].value / a[i - 12].value - 1) * 100).toFixed(2) : null));

  const { data: existing } = await admin.from("labor_observations").select("series_id,period,value,initial_value,revisions").limit(20000);
  const ex = new Map<string, any>((existing ?? []).map((r: any) => [`${r.series_id}|${r.period}`, r]));
  const now = new Date().toISOString();
  const rows: any[] = [];
  for (const [sid, pts] of Object.entries(fresh)) {
    for (const p of pts) {
      const old = ex.get(`${sid}|${p.period}`);
      if (!old) rows.push({ series_id: sid, period: p.period, value: p.value, initial_value: p.value, revisions: [], preliminary: p.prelim, updated_at: now });
      else if (Number(old.value) !== p.value)
        rows.push({ series_id: sid, period: p.period, value: p.value, initial_value: old.initial_value, revisions: [...(old.revisions ?? []), { at: now, from: Number(old.value), to: p.value }], preliminary: p.prelim, updated_at: now });
    }
  }
  for (let i = 0; i < rows.length; i += 500) await admin.from("labor_observations").upsert(rows.slice(i, i + 500), { onConflict: "series_id,period" });
  await admin.from("labor_observations").upsert({ series_id: SYNC_KEY, period: "0000-00", value: 0, initial_value: 0, updated_at: now }, { onConflict: "series_id,period" });
  return "ok";
}

/* ---------- Helpers ---------- */
const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  let v = Number(m[0]);
  if (/M/i.test(s)) v *= 1000;
  return v;
};
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fmtK = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v)}K`;
const monthName = (p: string) => new Date(`${p.slice(0, 7)}-15T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shiftMonth = (p: string, d: number) => {
  const [y, m] = p.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + d, 15));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
};

function dir(a: number, b: number, unit: Unit): Dir {
  const d = a - b;
  const thr = unit === "%" ? 0.05 : unit === "h" ? 0.05 : unit === "$" ? Math.abs(b) * 0.005 : Math.max(Math.abs(b) * 0.03, unit === "K" ? 10 : 0.5);
  if (Math.abs(d) <= thr) return "flat";
  return d > 0 ? "up" : "down";
}
function stats(p: Point[], unit: Unit): Stats {
  const v = p.map((x) => x.value);
  const n = v.length;
  const a = (k: number) => (n >= k ? avg(v.slice(-k)) : null);
  const t = (k: number): Dir => (n >= k * 2 ? dir(avg(v.slice(-k)), avg(v.slice(-k * 2, -k)), unit) : null);
  return {
    chg1: n >= 2 ? v[n - 1] - v[n - 2] : null,
    avg3: a(3), avg6: a(6), avg12: a(12),
    t3: t(3), t6: t(6),
    t12: n >= 13 ? dir(avg(v.slice(-3)), avg(v.slice(-15, -12)), unit) : null,
  };
}
const dWord = (d: Dir) => (d === "up" ? "rising" : d === "down" ? "falling" : d === "flat" ? "stable" : "not enough history");

/* ---------- Static metadata ---------- */
const LAG_CES = "Released with NFP, ~1 week after the reference month ends";
const LAG_JOLTS = "Released ~5 weeks after the reference month (usually after that month's NFP)";
const LAG_CLAIMS = "Weekly, released Thursday for the week ending the prior Saturday";
const LAG_ADP = "Released ~2 days before NFP for the same month";

/* ---------- Main fn ---------- */
export const getLaborDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LaborDashboard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;

    const { data: marker } = await admin.from("labor_observations").select("updated_at").eq("series_id", SYNC_KEY).maybeSingle();
    let sourceStatus: "ok" | "unavailable" = "ok";
    if (!marker || Date.now() - new Date(marker.updated_at).getTime() > SYNC_EVERY_MS) sourceStatus = await syncBls(admin);

    const { data: obs } = await admin.from("labor_observations").select("*").not("series_id", "like", "\\_SYNC%").order("period").limit(20000);
    const { data: mk2 } = await admin.from("labor_observations").select("updated_at").eq("series_id", SYNC_KEY).maybeSingle();
    const series = new Map<string, Point[]>();
    let trackingSince: string | null = null;
    for (const o of (obs ?? []) as any[]) {
      if (!trackingSince || o.first_seen_at < trackingSince) trackingSince = o.first_seen_at;
      const arr = series.get(o.series_id) ?? [];
      arr.push({ period: o.period, value: Number(o.value), initial: Number(o.initial_value), revisions: o.revisions ?? [], preliminary: o.preliminary, seen: o.first_seen_at });
      series.set(o.series_id, arr);
    }
    const S = (k: string) => series.get(k) ?? [];

    /* Calendar (ForexFactory feed) */
    const titles = ["Non-Farm Employment Change", "ADP Non-Farm Employment Change", "ADP Weekly Employment Change", "Unemployment Claims", "Average Hourly Earnings m/m", "Unemployment Rate", "JOLTS Job Openings", "Challenger Job Cuts y/y", "ISM Manufacturing PMI", "ISM Services PMI"];
    const { data: cal } = await admin.from("calendar_events")
      .select("title,event_date,actual,forecast,previous,previous_revised,previous_original,status")
      .eq("country", "USD").in("title", titles).order("event_date");
    const calendar: CalendarRow[] = (cal ?? []).map((r: any) => ({ ...r, date: r.event_date }));
    const nowIso = new Date().toISOString();
    const calSeries = (title: string): Point[] =>
      calendar.filter((r) => r.title === title && num(r.actual) != null).map((r) => ({ period: r.date.slice(0, 10), value: num(r.actual)!, initial: num(r.actual)!, revisions: [], preliminary: false, seen: r.date }));
    const nextCal = (title: string) => calendar.find((r) => r.title === title && r.date > nowIso && !r.actual)?.date ?? null;
    const latestCal = (title: string) => {
      const r = calendar.filter((x) => x.title === title && x.actual).pop();
      if (!r) return undefined;
      const a = num(r.actual), f = num(r.forecast);
      const vs = a == null || f == null ? "n/a" : Math.abs(a - f) <= Math.max(Math.abs(f) * 0.02, 0.05) ? "inline" : a > f ? "above" : "below";
      return { actual: r.actual, forecast: r.forecast || "—", previous: r.previous_original ?? r.previous ?? "—", revisedPrevious: r.previous_revised ? r.previous : null, date: r.date, vsExpect: vs as any };
    };

    const claims = calSeries("Unemployment Claims");
    const claims4: Point[] = claims.map((p, i, a) => (i >= 3 ? { ...p, value: Math.round(avg(a.slice(i - 3, i + 1).map((x) => x.value)) * 10) / 10, initial: 0, revisions: [] } : null)).filter(Boolean) as Point[];
    const adp = calSeries("ADP Non-Farm Employment Change");
    const nfpNext = nextCal("Non-Farm Employment Change");
    const joltsNext = nextCal("JOLTS Job Openings");

    type Def = { key: string; name: string; unit: Unit; pts: Point[]; source: string; cats: Cat[]; timing: Timing; kind: Kind; lag: string; note?: string; next?: string | null; latest?: Indicator["latest"] };
    const defs: Def[] = [
      { key: "nfp", name: "Nonfarm Payrolls (monthly change)", unit: "K", pts: S("NFP_CHG"), source: "BLS Employment Situation (CES)", cats: ["hiring"], timing: "Coincident", kind: "Derived calculation", lag: LAG_CES, note: "Monthly change computed from the BLS payroll level.", next: nfpNext, latest: latestCal("Non-Farm Employment Change") },
      { key: "priv", name: "Private payrolls (monthly change)", unit: "K", pts: S("PRIV_CHG"), source: "BLS (CES)", cats: ["hiring"], timing: "Coincident", kind: "Derived calculation", lag: LAG_CES, next: nfpNext },
      { key: "gov", name: "Government payrolls (monthly change)", unit: "K", pts: S("GOV_CHG"), source: "BLS (CES)", cats: ["hiring"], timing: "Coincident", kind: "Derived calculation", lag: LAG_CES, next: nfpNext },
      { key: "adp", name: "ADP Employment Change", unit: "K", pts: adp, source: "ADP (via ForexFactory calendar)", cats: ["hiring"], timing: "Leading / early signal", kind: "Actual observation", lag: LAG_ADP, note: "ADP provides evidence about private-sector employment but historically does not map one-to-one onto BLS NFP.", next: nextCal("ADP Non-Farm Employment Change"), latest: latestCal("ADP Non-Farm Employment Change") },
      { key: "hil", name: "JOLTS Hires", unit: "Klevel", pts: S("HIL"), source: "BLS JOLTS", cats: ["hiring", "demand", "jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, note: "Hires are a flow: people actually hired during the month.", next: joltsNext },
      { key: "hir", name: "JOLTS Hires Rate", unit: "%", pts: S("HIR"), source: "BLS JOLTS", cats: ["hiring", "demand", "jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "claims", name: "Initial Jobless Claims (weekly)", unit: "Klevel", pts: claims, source: "U.S. Dept. of Labor (via ForexFactory calendar)", cats: ["firing", "claims"], timing: "Leading / early signal", kind: "Actual observation", lag: LAG_CLAIMS, note: "Initial claims measure new unemployment-benefit claims and can provide evidence about labor-market stress. They are not a count of people fired.", next: nextCal("Unemployment Claims"), latest: latestCal("Unemployment Claims") },
      { key: "claims4", name: "Initial Claims — 4-week average", unit: "Klevel", pts: claims4, source: "Vesper calculation from DOL weekly data", cats: ["firing", "claims"], timing: "Leading / early signal", kind: "Moving average", lag: LAG_CLAIMS, note: "Calculated by Vesper — not an official published figure." },
      { key: "cont", name: "Continuing Jobless Claims", unit: "Klevel", pts: [], source: "U.S. Dept. of Labor", cats: ["firing", "claims"], timing: "Coincident", kind: "Actual observation", lag: LAG_CLAIMS },
      { key: "cont4", name: "Continuing Claims — 4-week average", unit: "Klevel", pts: [], source: "U.S. Dept. of Labor", cats: ["firing", "claims"], timing: "Coincident", kind: "Moving average", lag: LAG_CLAIMS },
      { key: "ldl", name: "JOLTS Layoffs & Discharges", unit: "Klevel", pts: S("LDL"), source: "BLS JOLTS", cats: ["firing", "jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, note: "Employer-initiated separations.", next: joltsNext },
      { key: "ldr", name: "JOLTS Layoffs & Discharges Rate", unit: "%", pts: S("LDR"), source: "BLS JOLTS", cats: ["firing", "jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "chall", name: "Challenger Job Cuts (y/y)", unit: "%", pts: calSeries("Challenger Job Cuts y/y"), source: "Challenger, Gray & Christmas (via ForexFactory calendar)", cats: ["firing"], timing: "Leading / early signal", kind: "Actual observation", lag: "Monthly, early in the following month", note: "Announced job cuts — announcements, not completed layoffs.", next: nextCal("Challenger Job Cuts y/y") },
      { key: "jol", name: "JOLTS Job Openings", unit: "Klevel", pts: S("JOL"), source: "BLS JOLTS", cats: ["demand", "jolts"], timing: "Leading / early signal", kind: "Actual observation", lag: LAG_JOLTS, note: "Openings are a stock (snapshot of unfilled positions on the last business day), not a flow.", next: joltsNext, latest: latestCal("JOLTS Job Openings") },
      { key: "jor", name: "JOLTS Openings Rate", unit: "%", pts: S("JOR"), source: "BLS JOLTS", cats: ["demand", "jolts"], timing: "Leading / early signal", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "nfib", name: "NFIB small-business hiring plans", unit: "%", pts: [], source: "NFIB", cats: ["demand"], timing: "Leading / early signal", kind: "Actual observation", lag: "Monthly, early in the following month" },
      { key: "ism_emp", name: "ISM employment components", unit: "%", pts: [], source: "ISM", cats: ["demand"], timing: "Leading / early signal", kind: "Actual observation", lag: "Monthly, first business days of the following month", note: "Only headline ISM PMIs appear in the current calendar feed; employment sub-indices are not available." },
      { key: "tsl", name: "JOLTS Total Separations", unit: "Klevel", pts: S("TSL"), source: "BLS JOLTS", cats: ["jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "qul", name: "JOLTS Quits", unit: "Klevel", pts: S("QUL"), source: "BLS JOLTS", cats: ["jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, note: "Voluntary separations — not layoffs.", next: joltsNext },
      { key: "qur", name: "JOLTS Quits Rate", unit: "%", pts: S("QUR"), source: "BLS JOLTS", cats: ["jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "osl", name: "JOLTS Other Separations", unit: "Klevel", pts: S("OSL"), source: "BLS JOLTS", cats: ["jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, note: "Retirements, deaths, disability, transfers.", next: joltsNext },
      { key: "osr", name: "JOLTS Other Separations Rate", unit: "%", pts: S("OSR"), source: "BLS JOLTS", cats: ["jolts"], timing: "Lagging", kind: "Actual observation", lag: LAG_JOLTS, next: joltsNext },
      { key: "unrate", name: "Unemployment rate (U-3)", unit: "%", pts: S("UNRATE"), source: "BLS household survey (CPS)", cats: ["supply", "firing"], timing: "Lagging", kind: "Actual observation", lag: LAG_CES, note: "From the household survey — a different system from jobless claims.", next: nfpNext, latest: latestCal("Unemployment Rate") },
      { key: "u6", name: "U-6 underemployment rate", unit: "%", pts: S("U6"), source: "BLS (CPS)", cats: ["supply"], timing: "Lagging", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "lfpr", name: "Labor-force participation rate", unit: "%", pts: S("LFPR"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "epop", name: "Employment-population ratio", unit: "%", pts: S("EPOP"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "lf", name: "Civilian labor force", unit: "Klevel", pts: S("LF"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "emp", name: "Employment level (household)", unit: "Klevel", pts: S("EMP"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "unemp", name: "Unemployment level", unit: "Klevel", pts: S("UNEMP"), source: "BLS (CPS)", cats: ["supply"], timing: "Lagging", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "ft", name: "Full-time employment", unit: "Klevel", pts: S("FT"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "pt", name: "Part-time employment", unit: "Klevel", pts: S("PT"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "pter", name: "Part-time for economic reasons", unit: "Klevel", pts: S("PTER"), source: "BLS (CPS)", cats: ["supply"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "ahe_mom", name: "Average Hourly Earnings MoM", unit: "%", pts: S("AHE_MOM"), source: "BLS (CES)", cats: ["wages"], timing: "Lagging", kind: "Derived calculation", lag: LAG_CES, next: nfpNext, latest: latestCal("Average Hourly Earnings m/m") },
      { key: "ahe_yoy", name: "Average Hourly Earnings YoY", unit: "%", pts: S("AHE_YOY"), source: "BLS (CES)", cats: ["wages"], timing: "Lagging", kind: "Derived calculation", lag: LAG_CES, next: nfpNext },
      { key: "awe", name: "Average Weekly Earnings", unit: "$", pts: S("AWE"), source: "BLS (CES)", cats: ["wages"], timing: "Lagging", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "awe_yoy", name: "Average Weekly Earnings YoY", unit: "%", pts: S("AWE_YOY"), source: "BLS (CES)", cats: ["wages"], timing: "Lagging", kind: "Derived calculation", lag: LAG_CES, next: nfpNext },
      { key: "eci", name: "Employment Cost Index", unit: "%", pts: [], source: "BLS (quarterly)", cats: ["wages"], timing: "Lagging", kind: "Actual observation", lag: "Quarterly, ~1 month after quarter end", note: "Quarterly series — not yet connected." },
      { key: "awh", name: "Average weekly hours (private)", unit: "h", pts: S("AWH"), source: "BLS (CES)", cats: ["hours"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, note: "Employers often adjust hours before headcount.", next: nfpNext },
      { key: "mfg_hrs", name: "Manufacturing weekly hours", unit: "h", pts: S("MFG_HRS"), source: "BLS (CES)", cats: ["hours"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
      { key: "mfg_ot", name: "Manufacturing overtime hours", unit: "h", pts: S("MFG_OT"), source: "BLS (CES)", cats: ["hours"], timing: "Coincident", kind: "Actual observation", lag: LAG_CES, next: nfpNext },
    ];
    const indicators: Indicator[] = defs.map((d) => ({
      key: d.key, name: d.name, unit: d.unit, source: d.source, cats: d.cats, timing: d.timing, kind: d.kind, lag: d.lag, note: d.note,
      available: d.pts.length > 0, points: d.pts.slice(-36), stats: stats(d.pts, d.unit), nextRelease: d.next ?? null, latest: d.latest,
    }));
    const I = (k: string) => indicators.find((i) => i.key === k)!;

    /* ---------- Pillars ---------- */
    const nfp = S("NFP_CHG"), priv = S("PRIV_CHG"), hil = S("HIL"), jol = S("JOL"), ldl = S("LDL"), qul = S("QUL"), unrate = S("UNRATE"), aheY = S("AHE_YOY"), awh = S("AWH");
    const tr = (k: string, n: 3 | 6 = 3) => (n === 3 ? I(k).stats.t3 : I(k).stats.t6);
    const blank = () => ({ condition: "Unavailable" as Condition, text: "Data unavailable — source not currently accessible.", forEv: [] as string[], againstEv: [] as string[] });
    const cats: LaborDashboard["categories"] = { hiring: blank(), firing: blank(), demand: blank(), wages: blank() };

    if (nfp.length >= 6) {
      const r3 = avg(nfp.slice(-3).map((p) => p.value)), p3 = avg(nfp.slice(-6, -3).map((p) => p.value));
      const pt = dir(r3, p3, "K"), ht = tr("hil"), at = tr("adp");
      const f: string[] = [], a: string[] = [];
      (pt === "up" ? f : pt === "down" ? a : []).push(`Payroll 3-mo avg ${fmtK(r3)} vs ${fmtK(p3)} prior`);
      if (ht) (ht === "up" ? f : ht === "down" ? a : []).push(`JOLTS hires ${dWord(ht)}`);
      if (at) (at === "up" ? f : at === "down" ? a : []).push(`ADP ${dWord(at)} (context only)`);
      const cond: Condition = f.length && a.length ? "Mixed" : f.length >= 1 && pt === "up" ? "Strengthening" : a.length >= 1 && pt === "down" ? "Weakening" : "Stable";
      cats.hiring = { condition: cond, text: `BLS payrolls averaged ${fmtK(r3)} over the last 3 months vs ${fmtK(p3)} in the 3 months before.${ht ? ` JOLTS hires: ${dWord(ht)}.` : ""}`, forEv: f, againstEv: a };
    }
    {
      const ct = I("claims4").stats.t3 ?? tr("claims"), lt = tr("ldl"), ut = tr("unrate");
      const ups: string[] = [], downs: string[] = [];
      if (ct) (ct === "up" ? ups : ct === "down" ? downs : []).push(`Claims ${dWord(ct)}`);
      if (lt) (lt === "up" ? ups : lt === "down" ? downs : []).push(`Layoffs & discharges ${dWord(lt)}`);
      if (ut) (ut === "up" ? ups : ut === "down" ? downs : []).push(`Unemployment rate ${dWord(ut)}`);
      if (ct || lt || ut) {
        const cond: Condition = ups.length >= 2 && !downs.length ? "Weakening" : downs.length >= 2 && !ups.length ? "Strengthening" : ups.length && downs.length ? "Mixed" : "Stable";
        const last = unrate[unrate.length - 1];
        cats.firing = { condition: cond, text: `Layoffs & discharges: ${dWord(lt)}; unemployment rate: ${dWord(ut)}${last ? ` (latest ${last.value}%)` : ""}; weekly claims: ${dWord(ct)}. Rising layoff measures can indicate weakening conditions.`, forEv: downs, againstEv: ups };
      }
    }
    {
      const jt = tr("jol"), ht = tr("hil"), qt = tr("qul");
      if (jt && ht) {
        const f: string[] = [], a: string[] = [];
        for (const [n, t] of [["Openings", jt], ["Hires", ht], ["Quits", qt]] as const) if (t) (t === "up" ? f : t === "down" ? a : []).push(`${n} ${dWord(t)}`);
        const cond: Condition = f.length && a.length ? "Mixed" : f.length >= 2 ? "Strengthening" : a.length >= 2 ? "Weakening" : "Stable";
        const lo = jol[jol.length - 1], lh = hil[hil.length - 1];
        cats.demand = { condition: cond, text: `Openings ${lo ? `${(lo.value / 1000).toFixed(2)}M` : "n/a"} (${dWord(jt)}); hires ${lh ? `${(lh.value / 1000).toFixed(2)}M` : "n/a"} (${dWord(ht)}). Openings ≠ hires: openings are positions employers are trying to fill; hires are people actually hired.`, forEv: f, againstEv: a };
      }
    }
    if (aheY.length >= 6) {
      const t = tr("ahe_yoy"), l = aheY[aheY.length - 1];
      const phr = t === "up" ? "accelerating" : t === "down" ? (l.value >= 3.5 ? "remains elevated but is cooling" : "cooling") : "steady";
      cats.wages = { condition: t === "up" ? "Strengthening" : t === "down" ? "Weakening" : "Stable", text: `Average hourly earnings are ${l.value}% higher than a year ago (${monthName(l.period)}); yearly wage growth is ${phr}. Not classified as good or bad by itself.`, forEv: t === "up" ? ["AHE YoY accelerating"] : [], againstEv: t === "down" ? ["AHE YoY cooling"] : [] };
    }

    /* ---------- Overall ---------- */
    const firmSig: string[] = [], coolSig: string[] = [];
    for (const c of Object.values(cats)) { firmSig.push(...c.forEv); coolSig.push(...c.againstEv); }
    const awt = tr("awh");
    if (awt === "down") coolSig.push("Average weekly hours falling"); else if (awt === "up") firmSig.push("Average weekly hours rising");
    const totalSig = firmSig.length + coolSig.length;
    const condVals = Object.values(cats).map((c) => c.condition).filter((c) => c !== "Unavailable");
    const weakN = condVals.filter((c) => c === "Weakening").length, strongN = condVals.filter((c) => c === "Strengthening").length, mixedN = condVals.filter((c) => c === "Mixed").length;
    let label: LaborDashboard["overall"]["label"] = "Insufficient data";
    if (condVals.length >= 2) label = weakN >= 3 ? "Weakening" : strongN >= 3 ? "Strengthening" : weakN >= 1 && strongN === 0 && coolSig.length > firmSig.length ? "Cooling" : strongN >= 1 && weakN === 0 && firmSig.length > coolSig.length ? "Strengthening" : weakN && strongN || mixedN >= 2 ? "Mixed" : "Stable";
    const majority = Math.max(firmSig.length, coolSig.length), minority = Math.min(firmSig.length, coolSig.length);
    const strength: "Weak" | "Moderate" | "Strong" = totalSig < 3 ? "Weak" : majority >= 4 && minority <= 1 ? "Strong" : majority > minority ? "Moderate" : "Weak";
    const leanCool = label === "Cooling" || label === "Weakening";
    const supporting = label === "Mixed" || label === "Stable" ? Math.max(firmSig.length, coolSig.length) : leanCool ? coolSig.length : firmSig.length;
    const contradicting = label === "Mixed" || label === "Stable" ? minority : leanCool ? firmSig.length : coolSig.length;
    const textMap: Record<string, string> = {
      Weakening: "Labor market appears to be weakening across several measures.",
      Cooling: "Labor market appears to be gradually cooling.",
      Strengthening: "Labor market appears to be firming.",
      Mixed: "Labor indicators are conflicting — the picture is mixed.",
      Stable: "Labor market appears broadly stable.",
      "Insufficient data": "Not enough verified data to describe the overall labor market.",
    };
    const overallText = textMap[label] + (contradicting > 0 && label !== "Mixed" && label !== "Insufficient data" ? " Evidence is not one-sided." : "");
    const overall = { label, strength, supporting, contradicting, text: overallText };

    /* ---------- Conflicts ---------- */
    const conflicts: Conflict[] = [];
    const lastAdp = adp[adp.length - 1], lastPriv = priv[priv.length - 1];
    if (lastAdp && lastPriv && Math.abs(lastAdp.value - lastPriv.value) > 75) conflicts.push({
      title: "ADP vs BLS private payrolls diverge", indicators: `ADP ${fmtK(lastAdp.value)} vs BLS private ${fmtK(lastPriv.value)}`,
      measures: "ADP is a private-payroll estimate from ADP client data. BLS private payrolls come from a government survey of ~120k businesses.",
      reasons: "Different samples, timing, seasonal adjustment, and later BLS revisions. Neither is automatically 'wrong'.",
      certainty: "Lowers certainty — ADP does not map one-to-one onto NFP.",
    });
    const jt = tr("jol"), ht = tr("hil"), qt = tr("qul"), lt = tr("ldl");
    if (jt === "up" && ht === "down") conflicts.push({
      title: "Openings rising while hires fall", indicators: `Openings ↑ vs hires ↓${qt === "down" ? " · quits ↓" : ""}${lt === "up" ? " · layoffs ↑" : ""}`,
      measures: "Openings = positions employers want to fill (a snapshot). Hires = people actually hired (a flow).",
      reasons: "Employers may post roles but hire cautiously, or struggle to fill them.",
      certainty: qt === "down" || lt === "up" ? "Pattern looks mixed / possibly weakening rather than 'demand strong'." : "Demand signal is ambiguous; actual hires matter more for payrolls.",
    });
    const c4 = I("claims4").stats.t3 ?? tr("claims");
    if (cats.hiring.condition === "Weakening" && (c4 === "down" || c4 === "flat")) conflicts.push({
      title: "Claims steady while payroll growth slows", indicators: "Initial claims steady vs slowing BLS payrolls",
      measures: "Claims track new benefit filings. Payrolls track net job creation.",
      reasons: "A 'low-hire, low-fire' market: firms are not laying off but also not adding many workers.",
      certainty: "Moderately lowers certainty — weak hiring without layoffs can persist or turn.",
    });
    if (cats.wages.condition === "Strengthening" && cats.hiring.condition === "Weakening") conflicts.push({
      title: "Wages firm while hiring slows", indicators: "AHE accelerating vs payroll growth slowing",
      measures: "AHE measures pay per hour; payrolls measure job count.",
      reasons: "Composition effects (lower-paid jobs lost first raise the average), tight worker supply, or lagged contracts.",
      certainty: "Lowers certainty on the inflation reading of the labor market.",
    });
    if (awt === "down" && cats.hiring.condition !== "Weakening" && lt !== "up") conflicts.push({
      title: "Hours falling while headcount holds", indicators: "Average weekly hours ↓ vs stable payrolls / layoffs",
      measures: "Hours show how intensively staff are used; payrolls count jobs.",
      reasons: "Employers can trim hours before cutting headcount — a possible early softening sign, not proof of future layoffs.",
      certainty: "Slightly lowers confidence in a 'stable' reading.",
    });

    /* ---------- Revisions center ---------- */
    const nfpRows = calendar.filter((r) => r.title === "Non-Farm Employment Change");
    const relFor = (refMonth: string, offset: number) => nfpRows.find((r) => r.date.slice(0, 7) === shiftMonth(refMonth, offset));
    const revisions: RevisionRow[] = nfp.slice(-12).map((p) => {
      const r1 = relFor(p.period, 1), r2 = relFor(p.period, 2);
      const calInit = r1 ? num(r1.actual) : null;
      const calRev1 = r2 && r2.previous_revised ? num(r2.previous) : null;
      const initial = calInit ?? (p.revisions.length || p.initial !== p.value ? p.initial : null) ?? (p.revisions.length === 0 ? p.value : null);
      const tracked = p.revisions.map((r) => r.to);
      const rev1 = calRev1 ?? tracked[0] ?? null;
      const rev2 = tracked.length >= 2 ? tracked[1] : calRev1 != null && Math.round(p.value) !== Math.round(calRev1) ? p.value : null;
      const latest = Math.round(p.value);
      return { period: p.period, initial: initial != null ? Math.round(initial) : null, rev1: rev1 != null ? Math.round(rev1) : null, rev2: rev2 != null ? Math.round(rev2) : null, latest, total: initial != null ? latest - Math.round(initial) : null, source: calInit != null ? "Initial: ForexFactory calendar · Latest: BLS" : "BLS (revisions tracked since first sync)" };
    }).reverse();
    const revTotals = revisions.slice(0, 6).map((r) => r.total).filter((x): x is number => x != null && Math.abs(x) >= 1);
    const ups = revTotals.filter((x) => x > 0).length, dns = revTotals.filter((x) => x < 0).length;
    const revisionDirection = revTotals.length < 2 ? "Not enough history" : ups >= dns * 2 && ups > 0 ? "Upward" : dns >= ups * 2 && dns > 0 ? "Downward" : "Mixed";

    /* ---------- Sectors ---------- */
    const sectors = SECTORS.map(([k, name]) => {
      const p = S(`${k}_CHG`);
      const last = p[p.length - 1], prev = p[p.length - 2];
      const rev = last && last.revisions.length ? last.value - last.initial : prev && prev.revisions.length ? prev.value - prev.initial : null;
      return { name, current: last ? Math.round(last.value) : null, previous: prev ? Math.round(prev.value) : null, revision: rev != null ? Math.round(rev) : null, avg3: p.length >= 3 ? Math.round(avg(p.slice(-3).map((x) => x.value))) : null };
    });

    /* ---------- Evidence board with information vintage ---------- */
    // refMonth = NFP reference month; releaseDate = NFP release. Only uses info released before releaseDate.
    const buildBoard = (refMonth: string, releaseDate: string): Evidence[] => {
      const cesCut = shiftMonth(refMonth, -1); // CES/CPS for prior month known
      const joltsRows = calendar.filter((r) => r.title === "JOLTS Job Openings" && r.actual && r.date < releaseDate);
      const joltsCut = joltsRows.length ? shiftMonth(joltsRows[joltsRows.length - 1].date.slice(0, 7), -1) : shiftMonth(refMonth, -2);
      const upTo = (k: string, cut: string) => S(k).filter((p) => p.period <= cut);
      const ev: Evidence[] = [];
      const add = (group: string, indicator: string, pts: Point[], unit: Unit, upMeans: "stronger" | "weaker" | "neutral", vintage: string, extra = "") => {
        if (pts.length < 6) { ev.push({ group, indicator, signal: "Insufficient evidence", detail: "Not enough history available before this release.", vintage }); return; }
        const s = stats(pts, unit);
        const t3 = s.t3, t6 = s.t6;
        let signal: Signal = "Neutral";
        if (upMeans === "neutral") signal = "Neutral";
        else if (t3 && t6 && t3 !== "flat" && t6 !== "flat" && t3 !== t6) signal = "Mixed";
        else if (t3 === "up") signal = upMeans === "stronger" ? "Supports stronger NFP" : "Supports weaker NFP";
        else if (t3 === "down") signal = upMeans === "stronger" ? "Supports weaker NFP" : "Supports stronger NFP";
        ev.push({ group, indicator, signal, detail: `3-month trend ${dWord(t3)}, 6-month ${dWord(t6)}.${extra}`, vintage });
      };
      const cesV = `Data through ${monthName(cesCut)}`;
      add("HIRING", "BLS payrolls (3-mo avg)", upTo("NFP_CHG", cesCut), "K", "stronger", cesV);
      add("HIRING", "Private payrolls", upTo("PRIV_CHG", cesCut), "K", "stronger", cesV);
      add("HIRING", "Government payrolls", upTo("GOV_CHG", cesCut), "K", "stronger", cesV);
      const adpBefore = adp.filter((p) => p.period < releaseDate.slice(0, 10));
      add("HIRING", "ADP employment (context only)", adpBefore, "K", "stronger", adpBefore.length ? `Latest ADP ${adpBefore[adpBefore.length - 1].period}` : "None before release", " ADP does not map one-to-one onto NFP.");
      const jV = `JOLTS through ${monthName(joltsCut)}`;
      add("HIRING", "JOLTS hires", upTo("HIL", joltsCut), "Klevel", "stronger", jV);
      const cl = claims4.filter((p) => p.period < releaseDate.slice(0, 10));
      add("FIRING", "Initial claims (4-wk avg)", cl, "Klevel", "weaker", cl.length ? `Weeks through ${cl[cl.length - 1].period}` : "None before release");
      add("FIRING", "JOLTS layoffs & discharges", upTo("LDL", joltsCut), "Klevel", "weaker", jV);
      add("WORKER DEMAND", "JOLTS job openings", upTo("JOL", joltsCut), "Klevel", "stronger", jV);
      add("WORKER DEMAND", "JOLTS quits", upTo("QUL", joltsCut), "Klevel", "stronger", jV, " Quits are voluntary — rising quits usually reflect worker confidence.");
      add("WAGES", "Average hourly earnings YoY", upTo("AHE_YOY", cesCut), "%", "neutral", cesV, " Wages describe pay, not job counts — not used as a direction signal.");
      add("UNEMPLOYMENT", "Unemployment rate", upTo("UNRATE", cesCut), "%", "weaker", cesV);
      add("HOURS", "Average weekly hours", upTo("AWH", cesCut), "h", "stronger", cesV);
      const revPts = upTo("NFP_CHG", cesCut).slice(-2).filter((p) => p.revisions.length || p.initial !== p.value);
      if (!revPts.length) ev.push({ group: "REVISIONS", indicator: "Recent payroll revisions", signal: "Insufficient evidence", detail: "No tracked revisions for the last two months yet.", vintage: cesV });
      else { const net = revPts.reduce((s, p) => s + (p.value - p.initial), 0); ev.push({ group: "REVISIONS", indicator: "Recent payroll revisions", signal: Math.abs(net) < 10 ? "Neutral" : net > 0 ? "Supports stronger NFP" : "Supports weaker NFP", detail: `Net revision to last two months: ${fmtK(net)}.`, vintage: cesV }); }
      const pos = SECTORS.filter(([k]) => { const p = upTo(`${k}_CHG`, cesCut); return p.length >= 3 && avg(p.slice(-3).map((x) => x.value)) > 0; }).length;
      const counted = SECTORS.filter(([k]) => upTo(`${k}_CHG`, cesCut).length >= 3).length;
      ev.push(counted < 6
        ? { group: "SECTOR SIGNALS", indicator: "Sector breadth", signal: "Insufficient evidence", detail: "Not enough sector history.", vintage: cesV }
        : { group: "SECTOR SIGNALS", indicator: "Sector breadth", signal: pos / counted >= 0.65 ? "Supports stronger NFP" : pos / counted <= 0.4 ? "Supports weaker NFP" : "Mixed", detail: `${pos} of ${counted} sectors added jobs on a 3-month average basis.`, vintage: cesV });
      ev.push({ group: "BUSINESS SURVEYS", indicator: "ISM employment / NFIB hiring plans", signal: "Insufficient evidence", detail: "Data unavailable — source not currently accessible.", vintage: "—" });
      return ev;
    };

    /* Next NFP */
    const nextRow = nfpRows.find((r) => r.date > nowIso && !r.actual);
    const nextRef = nextRow ? shiftMonth(nextRow.date.slice(0, 7), -1) : null;
    const nextNfp = nextRow ? { date: nextRow.date, forecast: nextRow.forecast || "—", previous: nextRow.previous || "—", refMonth: nextRef! } : null;
    const consensusNfp = nextRow ? num(nextRow.forecast) : null;
    const boardRef = nextRef ?? shiftMonth(new Date().toISOString().slice(0, 7), 0);
    const board = buildBoard(boardRef, nextRow?.date ?? nowIso);

    /* Scenarios — exactly three */
    const strongerEv = board.filter((e) => e.signal === "Supports stronger NFP").map((e) => `${e.indicator}: ${e.detail}`);
    const weakerEv = board.filter((e) => e.signal === "Supports weaker NFP").map((e) => `${e.indicator}: ${e.detail}`);
    const neutralEv = board.filter((e) => e.signal === "Neutral" || e.signal === "Mixed").map((e) => `${e.indicator} (${e.signal.toLowerCase()}): ${e.detail}`);
    const band = consensusNfp != null ? Math.max(40, Math.abs(consensusNfp) * 0.35) : null;
    const strengthFor = (own: number, other: number): { s: Strength; why: string } => {
      if (own === 0) return { s: "WEAK EVIDENCE", why: "Little current data points this way." };
      if (other > 0 && Math.abs(own - other) <= 1) return { s: "MIXED EVIDENCE", why: "Evidence on both sides is comparable." };
      if (own >= 4 && other <= 1) return { s: "STRONG EVIDENCE", why: "Several independent indicators point this way with little against it." };
      if (own >= 2 && own > other) return { s: "MODERATE EVIDENCE", why: "More indicators support this than contradict it." };
      return { s: "WEAK EVIDENCE", why: "Only limited or contradicted support." };
    };
    const H = strongerEv.length, L = weakerEv.length;
    const sH = strengthFor(H, L), sL = strengthFor(L, H);
    const sN = Math.abs(H - L) <= 1 || conflicts.length ? { s: "MODERATE EVIDENCE" as Strength, why: "Signals offset each other or conflict, which is consistent with a result near expectations." } : { s: "WEAK EVIDENCE" as Strength, why: "Evidence leans to one side." };
    const rng = (k: string) => consensusNfp == null || band == null ? "Consensus not yet published — no range shown." :
      k === "high" ? `Above ~${fmtK(consensusNfp + band)}` : k === "low" ? `Below ~${fmtK(consensusNfp - band)}` : `${fmtK(consensusNfp - band)} to ${fmtK(consensusNfp + band)} (around consensus ${fmtK(consensusNfp)})`;
    const scenarios: Scenario[] = [
      { key: "high", label: "HIGH NFP", range: rng("high"), definition: "Payrolls print clearly above consensus.", supporting: strongerEv, contradicting: weakerEv, strength: sH.s, why: sH.why,
        keyIndicators: ["Payroll 3-mo trend", "Claims 4-wk avg", "JOLTS hires", "Sector breadth"], confirm: "Broad-based sector gains, upward revisions to prior months.", invalidate: "Rising claims into the release or a soft ADP/hires picture that persists." },
      { key: "neutral", label: "NEUTRAL NFP", range: rng("neutral"), definition: "Payrolls land close to consensus.", supporting: neutralEv, contradicting: [...strongerEv, ...weakerEv].slice(0, 4), strength: sN.s, why: sN.why,
        keyIndicators: ["Consensus", "Payroll 3-mo average", "Revisions"], confirm: "Indicators remain balanced or conflicting into the release.", invalidate: "A clear one-sided shift in claims or ADP close to the release." },
      { key: "low", label: "LOW NFP", range: rng("low"), definition: "Payrolls print clearly below consensus.", supporting: weakerEv, contradicting: strongerEv, strength: sL.s, why: sL.why,
        keyIndicators: ["Payroll 3-mo trend", "Claims 4-wk avg", "Hours worked", "Revisions"], confirm: "Rising claims, falling hours, narrowing sector breadth, downward revisions.", invalidate: "Claims falling and hires/openings stabilising." },
    ];
    if (H === 0 && L === 0) scenarios.forEach((s) => (s.why = "Evidence is mixed or unavailable."));

    /* Consensus panel */
    const sameDay = (t: string, d?: string) => (d ? calendar.find((r) => r.title === t && r.date.slice(0, 10) === d.slice(0, 10)) : undefined);
    const lastRel = nfpRows.filter((r) => r.actual).pop();
    const focusDate = nextRow?.date ?? lastRel?.date;
    const cRow = (name: string, t: string): Consensus => {
      const r = sameDay(t, focusDate);
      return r ? { name, consensus: r.forecast || "—", previous: r.previous || "—", actual: r.actual || null, available: true } : { name, consensus: "—", previous: "—", actual: null, available: false };
    };
    const consensus = [
      cRow("Nonfarm Payrolls", "Non-Farm Employment Change"),
      cRow("Unemployment rate", "Unemployment Rate"),
      cRow("Average Hourly Earnings MoM", "Average Hourly Earnings m/m"),
      { name: "Average Hourly Earnings YoY", consensus: "—", previous: aheY.length ? `${aheY[aheY.length - 1].value}% (BLS)` : "—", actual: null, available: false },
    ];

    /* Post-NFP review — only pre-release info used for the "known before" board */
    let review: Review | null = null;
    if (lastRel) {
      const ref = shiftMonth(lastRel.date.slice(0, 7), -1);
      const b = buildBoard(ref, lastRel.date);
      const s = b.filter((e) => e.signal === "Supports stronger NFP").length, w = b.filter((e) => e.signal === "Supports weaker NFP").length;
      const lean = s - w >= 2 ? "stronger" : w - s >= 2 ? "weaker" : "balanced";
      const a = num(lastRel.actual), c = num(lastRel.forecast);
      const outcome = a == null || c == null ? "n/a" : Math.abs(a - c) <= Math.max(25, Math.abs(c) * 0.15) ? "inline" : a > c ? "above" : "below";
      const want = outcome === "above" ? "Supports stronger NFP" : outcome === "below" ? "Supports weaker NFP" : null;
      const anti = outcome === "above" ? "Supports weaker NFP" : outcome === "below" ? "Supports stronger NFP" : null;
      review = {
        refMonth: ref, releaseDate: lastRel.date, consensus: c, actual: a, outcome, board: b, lean,
        useful: want ? b.filter((e) => e.signal === want).map((e) => e.indicator) : b.filter((e) => e.signal === "Neutral" || e.signal === "Mixed").map((e) => e.indicator),
        misled: anti ? b.filter((e) => e.signal === anti).map((e) => e.indicator) : b.filter((e) => e.signal === "Supports stronger NFP" || e.signal === "Supports weaker NFP").map((e) => e.indicator),
        afterOnly: [
          `${monthName(ref)} sector breakdown, unemployment rate, hours and wages (released with NFP)`,
          `Revisions to the two prior months (released with NFP)`,
          `${monthName(ref)} JOLTS (released weeks after NFP)`,
          "Market reaction to the release",
        ],
      };
    }

    /* Potential macro transmission (conditional language only) */
    let transmission: string[] | null = null;
    if (review && review.outcome !== "n/a") {
      const o = review.outcome;
      transmission = o === "inline"
        ? ["An in-line report tends to leave existing expectations for monetary policy broadly unchanged, all else equal.", "Market moves, if any, may then depend more on revisions, wages and the unemployment rate than on the headline."]
        : [
            `${o === "above" ? "Stronger" : "Weaker"}-than-expected employment data could ${o === "above" ? "reduce" : "increase"} expectations for near-term monetary easing, all else equal.`,
            `USD: could ${o === "above" ? "find support" : "come under pressure"} if rate expectations shift accordingly.`,
            `Treasury yields: front-end yields are often the most sensitive to a change in Fed expectations.`,
            `Gold: a ${o === "above" ? "rise" : "fall"} in real yields and the USD is historically ${o === "above" ? "a headwind" : "supportive"}, though other drivers frequently dominate.`,
            `Risk assets & crypto: reaction is ambiguous — ${o === "above" ? "growth resilience vs. tighter financial conditions" : "easier policy expectations vs. growth concerns"}.`,
            "Wages and revisions can change the interpretation of the headline. None of this is a price prediction.",
          ];
    }

    /* Freshness */
    const syncedAt = mk2?.updated_at ?? null;
    const age = syncedAt ? Date.now() - new Date(syncedAt).getTime() : Infinity;
    const core = ["nfp", "unrate", "jol", "ahe_yoy", "claims"].map((k) => I(k).available);
    const freshness = sourceStatus === "ok" && age < SYNC_EVERY_MS * 1.5 && core.every(Boolean) ? "Current" : age < 24 * 3600e3 && core.some(Boolean) ? "Partially updated" : "Stale";

    const upcoming = calendar.filter((r) => r.date > nowIso && !r.actual).slice(0, 12);
    const picture = overall.text;

    return {
      syncedAt, sourceStatus, freshness, trackingSince, indicators, categories: cats, overall, picture, conflicts,
      nextNfp, board, scenarios, consensusNfp, consensus, revisions, revisionDirection, sectors, review, transmission, upcoming, calendar,
    };
  });
