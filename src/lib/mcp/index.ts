import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRecentTrades from "./tools/list-recent-trades";
import getTradeStats from "./tools/get-trade-stats";
import listTradingRules from "./tools/list-trading-rules";
import listWeeklyReviews from "./tools/list-weekly-reviews";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vesper-journal-mcp",
  title: "Vesper Journal",
  version: "0.1.0",
  instructions:
    "Tools for the Vesper Journal trading journal. Use these to read the signed-in trader's recent trades, aggregate performance stats, personal trading rules, and weekly reviews.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRecentTrades, getTradeStats, listTradingRules, listWeeklyReviews],
});