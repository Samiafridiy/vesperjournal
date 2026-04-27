import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { calcRR, calcResult, calcPnl } from "@/lib/trade-utils";

/**
 * Public webhook for MT4/MT5 Expert Advisors.
 * The user's id is passed as ?uid= so the EA can post without an auth token.
 * We use the service role key server-side to insert on their behalf.
 */
export const Route = createFileRoute("/api/ea-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        if (!uid) {
          return Response.json({ error: "Missing uid query param" }, { status: 400 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const pair = String(body.pair ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const direction = body.direction === "sell" ? "sell" : "buy";
        const lot = Number(body.lot_size);
        const entry = Number(body.entry_price);
        const close = body.close_price != null ? Number(body.close_price) : null;
        const sl = body.stop_loss != null ? Number(body.stop_loss) : null;
        const tp = body.take_profit != null ? Number(body.take_profit) : null;

        if (!pair || !lot || !entry) {
          return Response.json(
            { error: "pair, lot_size, entry_price required" },
            { status: 400 },
          );
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SERVICE_KEY) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const pnl =
          body.pnl != null
            ? Number(body.pnl)
            : calcPnl({ pair, direction, entry, close, lot });

        const { error } = await supabase.from("trades").insert({
          user_id: uid,
          pair,
          direction,
          lot_size: lot,
          entry_price: entry,
          close_price: close,
          stop_loss: sl,
          take_profit: tp,
          pnl,
          rr: calcRR({ direction, entry, stop: sl, takeProfit: tp, close }),
          result: calcResult(pnl ?? null),
          trade_date: body.trade_date ?? new Date().toISOString(),
          strategy: "EA webhook",
        });

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});