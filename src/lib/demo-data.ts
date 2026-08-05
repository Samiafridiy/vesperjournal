import type { Trade } from "@/lib/trade-utils";

/** Deterministic pseudo-random so the demo looks identical on every render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "NAS100", "GBPJPY"];
const SESSIONS = ["London", "New York", "Asia"];
const STRATEGIES = ["Breakout", "Liquidity sweep", "Trend pullback", "Range fade"];
const EMO_BEFORE = ["Calm", "Confident", "Neutral", "FOMO", "Rushed", "Revenge", "Anxious"];
const EMO_AFTER = ["Satisfied", "Calm", "Frustrated", "Neutral", "Confident"];
const MISTAKES = ["Overtrading", "Chased entry", "Moved stop", "Closed early", "Revenge trading", "No confluence"];
const WINS_WELL = ["Followed my plan", "Respected stop loss", "Patient entry", "Waited for confirmation"];

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

/** ~46 realistic sample trades spread over the last 60 days. */
export const DEMO_TRADES: Trade[] = (() => {
  const rnd = mulberry32(20260805);
  const out: Trade[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 46; i++) {
    const daysAgo = Math.floor((i / 46) * 58);
    const d = new Date(now - (58 - daysAgo) * day);
    d.setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);

    const pair = pick(rnd, PAIRS);
    const emotionBefore = pick(rnd, EMO_BEFORE);
    const sloppy = emotionBefore === "FOMO" || emotionBefore === "Revenge" || emotionBefore === "Rushed";
    const win = rnd() < (sloppy ? 0.32 : 0.63);
    const risk = 90 + Math.round(rnd() * 60);
    const rr = win ? 1.2 + rnd() * 1.8 : -1;
    const pnl = Math.round(risk * rr * 10) / 10;
    const direction = rnd() > 0.5 ? "buy" : "sell";
    const entry = pair === "XAUUSD" ? 2300 + rnd() * 120 : pair === "NAS100" ? 18000 + rnd() * 900 : 1.05 + rnd() * 0.2;
    const mistakes = sloppy && !win ? [pick(rnd, MISTAKES)] : rnd() < 0.15 ? [pick(rnd, MISTAKES)] : [];

    out.push({
      id: `demo-${i}`,
      user_id: "demo-user",
      account_id: null,
      risk_preset_id: null,
      pair,
      direction,
      lot_size: Math.round((0.2 + rnd() * 0.8) * 100) / 100,
      entry_price: Math.round(entry * 10000) / 10000,
      close_price: Math.round(entry * (1 + (win ? 0.004 : -0.003)) * 10000) / 10000,
      stop_loss: sloppy && rnd() < 0.35 ? null : Math.round(entry * 0.997 * 10000) / 10000,
      take_profit: Math.round(entry * 1.006 * 10000) / 10000,
      pnl,
      rr: Math.round(rr * 100) / 100,
      result: win ? "win" : "loss",
      session: pick(rnd, SESSIONS),
      strategy: pick(rnd, STRATEGIES),
      emotion_before: emotionBefore,
      emotion_after: win ? pick(rnd, EMO_AFTER) : rnd() < 0.6 ? "Frustrated" : "Neutral",
      confidence: 2 + Math.floor(rnd() * 4),
      followed_plan: !sloppy || rnd() > 0.6,
      mistakes,
      wins_well: win ? [pick(rnd, WINS_WELL)] : [],
      behavior_flags: sloppy ? ["emotional_entry"] : [],
      notes: win
        ? "Clean setup, waited for the retest before entering."
        : "Entered early without confirmation — cut it at the stop.",
      screenshot_url: null,
      trade_date: d.toISOString(),
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    } as Trade);
  }
  return out.sort((a, b) => +new Date(b.trade_date) - +new Date(a.trade_date));
})();

export const DEMO_PLAN = `Sample trading plan (demo)

1. Only trade EURUSD, GBPUSD and XAUUSD during London and New York.
2. Maximum 3 trades per day. Stop for the day after 2 losses.
3. Every trade needs a stop loss before entry — no exceptions.
4. Minimum 1.5R target; skip anything that doesn't offer it.
5. No trading within 15 minutes of high-impact news.
6. Journal emotion before and after every single trade.`;

export const DEMO_RULES = [
  { id: "demo-rule-1", user_id: "demo-user", text: "Max 3 trades per day", active: true, created_at: new Date().toISOString() },
  { id: "demo-rule-2", user_id: "demo-user", text: "Always use a stop loss", active: true, created_at: new Date().toISOString() },
  { id: "demo-rule-3", user_id: "demo-user", text: "No trading after 2 losses", active: true, created_at: new Date().toISOString() },
  { id: "demo-rule-4", user_id: "demo-user", text: "Minimum RR 1.5", active: true, created_at: new Date().toISOString() },
] as unknown as import("@/lib/rule-engine").TradingRule[];
