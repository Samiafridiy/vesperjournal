export type Impact = "HIGH" | "MEDIUM" | "LOW";

export type PlaybookScenario = {
  label: string;
  outcome: string;
  tone: "bullish" | "bearish" | "neutral";
};

export type EconomicEvent = {
  id: string;
  name: string;
  currency: string;
  /** ISO datetime for today's release. */
  time: string;
  impact: Impact;
  previous: string;
  forecast: string;
  /** Numeric forecast used to compare against actual (when set). */
  forecastNumber: number;
  /** Numeric actual once released. */
  actualNumber: number | null;
  unit?: string;
  /** Tiny historical sparkline values (most recent last). */
  history: number[];
  /** Plain-English explanation. */
  meaning: string;
  playbook: {
    above: PlaybookScenario;
    on: PlaybookScenario;
    below: PlaybookScenario;
  };
};

function atToday(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Today's economic calendar. Mocked but realistic — no API key required.
 * In a future iteration we can swap this out for a live feed.
 */
export function getTodaysEvents(): EconomicEvent[] {
  return [
    {
      id: "us-nfp",
      name: "Non-Farm Payrolls",
      currency: "USD",
      time: atToday(13, 30),
      impact: "HIGH",
      previous: "227K",
      forecast: "200K",
      forecastNumber: 200,
      actualNumber: null,
      unit: "K",
      history: [187, 254, 165, 223, 227],
      meaning:
        "Strong jobs print pushes the Fed to stay restrictive — bullish USD, bearish gold and indices.",
      playbook: {
        above: { label: "Above forecast", outcome: "Very Bullish USD", tone: "bullish" },
        on: { label: "On forecast", outcome: "Ranging — neutral", tone: "neutral" },
        below: { label: "Below forecast", outcome: "Very Bearish USD", tone: "bearish" },
      },
    },
    {
      id: "us-cpi",
      name: "Core CPI (YoY)",
      currency: "USD",
      time: atToday(13, 30),
      impact: "HIGH",
      previous: "3.3%",
      forecast: "3.2%",
      forecastNumber: 3.2,
      actualNumber: null,
      unit: "%",
      history: [4.0, 3.8, 3.6, 3.4, 3.3],
      meaning:
        "Hot inflation = higher rates for longer. Bullish DXY, bearish XAUUSD short term.",
      playbook: {
        above: { label: "Above forecast", outcome: "Bullish USD / Bearish Gold", tone: "bullish" },
        on: { label: "On forecast", outcome: "Choppy — fade extremes", tone: "neutral" },
        below: { label: "Below forecast", outcome: "Bearish USD / Bullish Gold", tone: "bearish" },
      },
    },
    {
      id: "ecb-rate",
      name: "ECB Interest Rate Decision",
      currency: "EUR",
      time: atToday(12, 45),
      impact: "HIGH",
      previous: "3.40%",
      forecast: "3.40%",
      forecastNumber: 3.4,
      actualNumber: null,
      unit: "%",
      history: [4.5, 4.25, 3.75, 3.5, 3.4],
      meaning:
        "A hawkish hold or hike supports EUR. A surprise cut hammers EURUSD.",
      playbook: {
        above: { label: "Hike / hawkish", outcome: "Bullish EUR", tone: "bullish" },
        on: { label: "Hold as expected", outcome: "Neutral — watch presser", tone: "neutral" },
        below: { label: "Cut / dovish", outcome: "Bearish EUR", tone: "bearish" },
      },
    },
    {
      id: "uk-gdp",
      name: "GDP (MoM)",
      currency: "GBP",
      time: atToday(7, 0),
      impact: "MEDIUM",
      previous: "0.2%",
      forecast: "0.1%",
      forecastNumber: 0.1,
      actualNumber: null,
      unit: "%",
      history: [-0.1, 0.0, 0.3, 0.2, 0.2],
      meaning:
        "Faster UK growth keeps BoE patient on cuts — supportive of GBP.",
      playbook: {
        above: { label: "Above forecast", outcome: "Bullish GBP", tone: "bullish" },
        on: { label: "On forecast", outcome: "Range bound", tone: "neutral" },
        below: { label: "Below forecast", outcome: "Bearish GBP", tone: "bearish" },
      },
    },
    {
      id: "us-retail",
      name: "Retail Sales (MoM)",
      currency: "USD",
      time: atToday(13, 30),
      impact: "MEDIUM",
      previous: "0.4%",
      forecast: "0.3%",
      forecastNumber: 0.3,
      actualNumber: null,
      unit: "%",
      history: [0.1, 0.7, -0.2, 0.4, 0.4],
      meaning:
        "Strong consumer = sticky inflation expectations. Mild USD positive.",
      playbook: {
        above: { label: "Above forecast", outcome: "Bullish USD", tone: "bullish" },
        on: { label: "On forecast", outcome: "Neutral", tone: "neutral" },
        below: { label: "Below forecast", outcome: "Bearish USD", tone: "bearish" },
      },
    },
    {
      id: "jp-ppi",
      name: "PPI (YoY)",
      currency: "JPY",
      time: atToday(0, 50),
      impact: "LOW",
      previous: "2.6%",
      forecast: "2.5%",
      forecastNumber: 2.5,
      actualNumber: null,
      unit: "%",
      history: [2.3, 2.4, 2.5, 2.6, 2.6],
      meaning:
        "Producer price pressure feeds into BoJ normalization expectations.",
      playbook: {
        above: { label: "Above forecast", outcome: "Mildly Bullish JPY", tone: "bullish" },
        on: { label: "On forecast", outcome: "Neutral", tone: "neutral" },
        below: { label: "Below forecast", outcome: "Mildly Bearish JPY", tone: "bearish" },
      },
    },
  ];
}

export function impactRank(i: Impact): number {
  return i === "HIGH" ? 0 : i === "MEDIUM" ? 1 : 2;
}

export function classifyHeadlineImpact(title: string): Impact {
  const t = title.toLowerCase();
  if (
    /\b(fomc|nfp|cpi|rate decision|ecb|fed|powell|inflation|recession|war|crash|emergency)\b/.test(
      t,
    )
  ) {
    return "HIGH";
  }
  if (
    /\b(gdp|retail sales|pmi|ppi|jobless|claims|earnings|guidance|opec|tariff)\b/.test(t)
  ) {
    return "MEDIUM";
  }
  return "LOW";
}

export function activeScenario(ev: EconomicEvent): "above" | "on" | "below" | null {
  if (ev.actualNumber == null) return null;
  const tol = Math.max(Math.abs(ev.forecastNumber) * 0.02, 0.05);
  const diff = ev.actualNumber - ev.forecastNumber;
  if (Math.abs(diff) <= tol) return "on";
  return diff > 0 ? "above" : "below";
}