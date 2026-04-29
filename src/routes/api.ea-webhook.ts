import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { calcRR, calcResult, calcPnl } from "@/lib/trade-utils";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...CORS, ...(init.headers ?? {}) },
  });
}

/**
 * Public webhook for MT4/MT5 Expert Advisors.
 * The user's id is passed as ?uid= so the EA can post without an auth token.
 * We use the service role key server-side to insert on their behalf.
 */
export const Route = createFileRoute("/api/ea-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // GET = lightweight ping/test endpoint for the "Test webhook" UI button.
      // Returns ok if uid is present so users can verify connectivity.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        const test = url.searchParams.get("test");
        if (!uid) return jsonResponse({ ok: false, error: "Missing uid" }, { status: 400 });
        return jsonResponse({
          ok: true,
          uid,
          test: test === "1",
          message: "EA webhook is live. POST trade payloads to this URL.",
          timestamp: new Date().toISOString(),
        });
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        if (!uid) {
          return jsonResponse({ error: "Missing uid query param" }, { status: 400 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
        }

        // Allow a simple test payload: { test: true }
        if (body && body.test === true && !body.pair) {
          return jsonResponse({ ok: true, test: true, message: "Test payload received." });
        }

        const pair = String(body.pair ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const direction = body.direction === "sell" ? "sell" : "buy";
        const lot = Number(body.lot_size);
        const entry = Number(body.entry_price);
        const close = body.close_price != null ? Number(body.close_price) : null;
        const sl = body.stop_loss != null ? Number(body.stop_loss) : null;
        const tp = body.take_profit != null ? Number(body.take_profit) : null;

        if (!pair || !lot || !entry) {
          return jsonResponse(
            { error: "pair, lot_size, entry_price required" },
            { status: 400 },
          );
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SERVICE_KEY) {
          return jsonResponse({ error: "Server misconfigured" }, { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const pnl =
          body.pnl != null
            ? Number(body.pnl)
            : calcPnl({ pair, direction, entry, close, lot });

        const { data, error } = await supabase.from("trades").insert({
          user_id: uid,
          pair,
          direction,
          lot_size: lot,
          entry_price: entry,
          close_price: close,
          stop_loss: sl,
          take_profit: tp,
          pnl,
          rr: calcRR({ pair, direction, entry, stop: sl, takeProfit: tp, close }),
          result: calcResult(pnl ?? null),
          trade_date: body.trade_date ?? new Date().toISOString(),
          strategy: "EA webhook",
        }).select("id").single();

        if (error) {
          return jsonResponse({ error: error.message }, { status: 500 });
        }
        return jsonResponse({ ok: true, id: data?.id });
      },
    },
  },
});